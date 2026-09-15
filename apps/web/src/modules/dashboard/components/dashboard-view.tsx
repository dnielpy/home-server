import { Boxes, ServerCog } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/modules/common/components/card";

export const DashboardView = () => {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="p-6 sm:p-8">
          <p className="text-primary text-sm font-semibold">Home Server</p>
          <CardTitle className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Tu centro de control está listo.
          </CardTitle>
          <CardDescription className="mt-3 max-w-2xl text-base leading-7">
            Aquí reuniremos las aplicaciones de tu servidor doméstico en una única experiencia.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <ServerCog aria-hidden="true" className="text-primary size-5" />
            <CardTitle className="mt-4">Estructura preparada</CardTitle>
            <CardDescription className="mt-1 leading-6">
              Layout, navegación y tema compartidos para las próximas aplicaciones.
            </CardDescription>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <Boxes aria-hidden="true" className="text-primary size-5" />
            <CardTitle className="mt-4">Aplicaciones por integrar</CardTitle>
            <CardDescription className="mt-1 leading-6">
              Los módulos del workspace se incorporarán gradualmente a este dashboard.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
