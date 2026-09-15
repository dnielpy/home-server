"use client";

import {
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import type { UserDto } from "@home-server/contracts/users";
import {
  createUser,
  deleteUser,
  updateUser,
} from "@/src/lib/services/users";
import { UserAvatar } from "@/src/modules/users/components/user-avatar";

type Editor = {
  user: UserDto | null;
  name: string;
  password: string;
  photoData: string | null;
  photoFileName: string | null;
  removePhoto: boolean;
};

const emptyEditor = (): Editor => ({
  user: null,
  name: "",
  password: "",
  photoData: null,
  photoFileName: null,
  removePhoto: false,
});

export const UsersManager = ({ initialUsers }: { initialUsers: UserDto[] }) => {
  const [users, setUsers] = useState(initialUsers);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const adminCount = useMemo(
    () => users.filter((user) => user.isAdmin).length,
    [users],
  );

  const openEdit = (user: UserDto) => {
    setError(null);
    setEditor({
      user,
      name: user.name,
      password: "",
      photoData: null,
      photoFileName: null,
      removePhoto: false,
    });
  };

  const readPhoto = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setError("La foto debe ser JPG, PNG o WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La foto no puede superar 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setEditor((current) =>
        current
          ? {
              ...current,
              photoData: typeof reader.result === "string" ? reader.result : null,
              photoFileName: file.name,
              removePhoto: false,
            }
          : current,
      );
    reader.readAsDataURL(file);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || pending) return;
    setPending(true);
    setError(null);
    try {
      const editing = Boolean(editor.user);
      const input = {
        name: editor.name,
        password: editor.password || undefined,
        photoData: editor.photoData || undefined,
        removePhoto: editor.removePhoto,
      };
      const result = editing
        ? await updateUser(editor.user!.id, input)
        : await createUser({ ...input, password: editor.password });
      if (!result.success) throw new Error(result.error.message);
      setUsers((current) =>
        editing
          ? current.map((user) => (user.id === result.data.id ? result.data : user))
          : [...current, result.data],
      );
      setEditor(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "No se pudo guardar el usuario.",
      );
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await deleteUser(deleteTarget.id);
      if (!result.success) throw new Error(result.error.message);
      setUsers((current) => current.filter((user) => user.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : "No se pudo eliminar el usuario.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl" aria-labelledby="users-title">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Administración
          </p>
          <h1 id="users-title" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Usuarios
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Gestiona los accesos al servidor, las credenciales y la identidad de cada miembro.
          </p>
        </div>
        <button
          type="button"
          aria-label="Nuevo usuario"
          title="Nuevo usuario"
          onClick={() => {
            setError(null);
            setEditor(emptyEditor());
          }}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus aria-hidden="true" className="size-5" />
        </button>
      </header>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Usuarios registrados
          </dt>
          <dd className="mt-2 text-2xl font-semibold tabular-nums">{users.length}</dd>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Administradores
          </dt>
          <dd className="mt-2 text-2xl font-semibold tabular-nums">{adminCount}</dd>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Acceso estándar
          </dt>
          <dd className="mt-2 text-2xl font-semibold tabular-nums">
            {users.length - adminCount}
          </dd>
        </div>
      </dl>

      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm" aria-labelledby="directory-title">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <UsersRound aria-hidden="true" className="size-4" />
            </span>
            <div>
              <h2 id="directory-title" className="font-semibold">Directorio de usuarios</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {users.length === 1 ? "1 usuario con acceso" : `${users.length} usuarios con acceso`}
              </p>
            </div>
          </div>
        </div>

        {users.length > 0 ? (
          <div role="table" aria-label="Usuarios registrados">
            <div role="row" className="hidden grid-cols-[minmax(0,1fr)_12rem_6rem] gap-6 border-b border-border bg-muted/40 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
              <div role="columnheader">Usuario</div>
              <div role="columnheader">Nivel de acceso</div>
              <div role="columnheader" className="text-right">Acciones</div>
            </div>
            <div className="divide-y divide-border">
              {users.map((user) => (
                <article
                  key={user.id}
                  role="row"
                  className="grid gap-4 px-5 py-4 transition-colors hover:bg-muted/35 md:grid-cols-[minmax(0,1fr)_12rem_6rem] md:items-center md:gap-6 md:px-6"
                >
                  <div role="cell" className="flex min-w-0 items-center gap-3.5">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-foreground">{user.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">Cuenta local</p>
                    </div>
                  </div>
                  <div role="cell" className="flex items-center gap-2 text-sm">
                    {user.isAdmin ? (
                      <>
                        <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
                        <span className="font-medium">Administrador</span>
                      </>
                    ) : (
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        Usuario estándar
                      </span>
                    )}
                  </div>
                  <div role="cell" className="flex justify-end gap-1">
                    <button
                      type="button"
                      aria-label={`Editar ${user.name}`}
                      onClick={() => openEdit(user)}
                      className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Pencil className="size-4" />
                    </button>
                    {!user.isAdmin && (
                      <button
                        type="button"
                        aria-label={`Eliminar ${user.name}`}
                        onClick={() => {
                          setError(null);
                          setDeleteTarget(user);
                        }}
                        className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <UsersRound aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No hay usuarios adicionales</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea un usuario para conceder acceso al servidor.
            </p>
          </div>
        )}
      </section>

      {editor && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="user-editor-title" className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
              <div>
                <h2 id="user-editor-title" className="text-2xl font-semibold tracking-tight">
                  {editor.user ? "Editar usuario" : "Nuevo usuario"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {editor.user
                    ? "Actualiza el perfil o renueva la contraseña de acceso."
                    : "Los usuarios nuevos se crean con acceso estándar."}
                </p>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setEditor(null)} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="size-4" />
              </button>
            </div>
            <form className="px-6 pb-6 pt-4" onSubmit={(event) => void submit(event)}>
              <div className="flex items-center gap-4 border-b border-border pb-5">
                <div>
                  {editor.photoData ? (
                    <Image unoptimized src={editor.photoData} alt="Vista previa" width={64} height={64} className="size-16 rounded-full object-cover" />
                  ) : (
                    <UserAvatar user={{ name: editor.name, photoUrl: editor.user?.photoUrl && !editor.removePhoto ? editor.user.photoUrl : null }} large />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Foto de perfil</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <input
                      id="profile-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) readPhoto(file);
                        event.currentTarget.value = "";
                      }}
                      className="sr-only"
                    />
                    <label
                      htmlFor="profile-photo"
                      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-within:ring-2 focus-within:ring-ring"
                    >
                      <Upload aria-hidden="true" className="size-4" />
                      Subir foto
                    </label>
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {editor.photoFileName ?? "PNG, JPG o WebP · Máximo 5 MB"}
                    </span>
                  </div>
                </div>
                {editor.user?.photoUrl && !editor.removePhoto && (
                  <button
                    type="button"
                    aria-label="Quitar foto actual"
                    title="Quitar foto actual"
                    onClick={() =>
                      setEditor({
                        ...editor,
                        photoData: null,
                        photoFileName: null,
                        removePhoto: true,
                      })
                    }
                    className="grid size-8 shrink-0 place-items-center rounded-md text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                )}
              </div>
              <label className="mt-6 block text-sm font-medium">
                Nombre de usuario
                <input autoFocus required maxLength={80} value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.currentTarget.value })} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/30" />
              </label>
              <label className="mt-5 block text-sm font-medium">
                {editor.user ? "Nueva contraseña (opcional)" : "Contraseña"}
                <input required={!editor.user} minLength={8} type="password" autoComplete="new-password" value={editor.password} onChange={(event) => setEditor({ ...editor, password: event.currentTarget.value })} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/30" />
              </label>
              {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
              <div className="mt-8 flex justify-end gap-2">
                <button type="button" onClick={() => setEditor(null)} className="h-10 rounded-md px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Cancelar
                </button>
                <button disabled={pending} type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {pending ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 id="delete-user-title" className="text-xl font-semibold">¿Eliminar a {deleteTarget.name}?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Esta persona perderá el acceso inmediatamente. También se eliminará su foto de perfil.
            </p>
            {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="h-10 rounded-lg px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Cancelar
              </button>
              <button disabled={pending} type="button" onClick={() => void remove()} className="h-10 rounded-lg bg-destructive px-5 text-sm font-semibold text-destructive-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {pending ? "Eliminando…" : "Eliminar usuario"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
