import type { Metadata } from "next";
import { DownloadsContainer } from "@/src/modules/downloads/containers/downloads-container";

export const metadata: Metadata = { title: "Descargas · Home Server", description: "Descargas privadas persistentes." };
export const dynamic = "force-dynamic";

const DownloadsPage = () => <DownloadsContainer />;

export default DownloadsPage;
