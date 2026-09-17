import { PageHeader, PageHeaderStatus } from "@/src/modules/common/components/page-header";

type StatsPageHeaderProps = {
  updatedAt: string;
};

export const StatsPageHeader = ({ updatedAt }: StatsPageHeaderProps) => {
  return (
    <PageHeader
      eyebrow="Servidor Ubuntu"
      title="Estadísticas del sistema"
      titleId="stats-title"
      description="Uso de recursos y tráfico de la interfaz de red del host."
      aside={<PageHeaderStatus>Actualizado {new Date(updatedAt).toLocaleTimeString("es-ES")}</PageHeaderStatus>}
    />
  );
};
