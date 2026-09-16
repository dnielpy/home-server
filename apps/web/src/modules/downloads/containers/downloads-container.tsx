import { getDownloads } from "../services/downloads";
import { DownloadsProvider } from "../providers/downloads-provider";
import { DownloadsView } from "../components/downloads-view";

export const DownloadsContainer = async () => {
  const result = await getDownloads();
  return (
    <DownloadsProvider
      initialData={result.success ? result.data : null}
      initialError={result.success ? undefined : result.error.message}
    >
      <DownloadsView />
    </DownloadsProvider>
  );
};
