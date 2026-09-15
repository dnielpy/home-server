import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { GalleryService } from "./gallery.service";
import { UserStorageService } from "../storage/user-storage.service";

let root = "";
let gallery: GalleryService;
const user = { id: "user-a", name: "alicia" } as never;
const otherUser = { id: "user-b", name: "bruno" } as never;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "home-server-gallery-"));
  process.env.EXTERNAL_DISK_MOUNT = root;
  gallery = new GalleryService(new UserStorageService());
});

afterEach(async () => {
  delete process.env.EXTERNAL_DISK_MOUNT;
  await rm(root, { recursive: true, force: true });
});

describe("GalleryService", () => {
  it("aísla las bibliotecas por usuario y trata las subcarpetas directas como álbumes", async () => {
    await gallery.saveUpload(user, Readable.from(["jpg"]), { fileName: "casa.jpg", folderName: "Familia" });
    await gallery.saveUpload(otherUser, Readable.from(["jpg"]), { fileName: "privada.jpg" });

    await expect(gallery.listMedia(user)).resolves.toMatchObject({ items: [{ fileName: "casa.jpg" }] });
    await expect(gallery.listMedia(otherUser)).resolves.toMatchObject({ items: [{ fileName: "privada.jpg" }] });
    await expect(gallery.listAlbums(user)).resolves.toMatchObject([{ name: "Familia", itemCount: 1 }]);
    await expect(gallery.listAlbums(otherUser)).resolves.toEqual([]);
  });

  it("no sobreescribe duplicados y admite una carga mayor de 8 MB", async () => {
    const first = await gallery.saveUpload(user, Readable.from(["uno"]), { fileName: "foto.jpg" });
    const second = await gallery.saveUpload(user, Readable.from(["dos"]), { fileName: "foto.jpg" });
    const large = Buffer.alloc(9 * 1024 * 1024, 1);
    await gallery.saveUpload(user, Readable.from([large]), { fileName: "archivo.bin" });
    const directory = path.join(root, "alicia", "gallery");
    expect([first.fileName, second.fileName]).toEqual(["foto.jpg", "foto (1).jpg"]);
    await expect(readFile(path.join(directory, "foto.jpg"), "utf8")).resolves.toBe("uno");
    await expect(readFile(path.join(directory, "foto (1).jpg"), "utf8")).resolves.toBe("dos");
    await expect(readFile(path.join(directory, "archivo.bin"))).resolves.toHaveLength(large.length);
  });

  it("devuelve rangos para vídeo y no acepta rutas como destinos", async () => {
    await expect(
      gallery.saveUpload(user, Readable.from(["x"]), { fileName: "x.jpg", folderName: "../fuera" }),
    ).rejects.toThrow();
    const directory = path.join(root, "alicia", "gallery");
    await gallery.saveUpload(user, Readable.from(["0123456789"]), { fileName: "clip.mp4" });
    const page = await gallery.listMedia(user);
    const video = page.items.find((item) => item.fileName === "clip.mp4");
    expect(video).toBeTruthy();
    await expect(gallery.openMedia(user, video!.id, "bytes=2-5", false)).resolves.toMatchObject({
      status: 206,
      headers: { "content-range": "bytes 2-5/10" },
    });
    await writeFile(path.join(directory, ".hidden.jpg"), "hidden");
    await expect(gallery.listMedia(user)).resolves.toMatchObject({
      items: expect.not.arrayContaining([expect.objectContaining({ fileName: ".hidden.jpg" })]),
    });
  });
});
