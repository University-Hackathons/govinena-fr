"use client";

import Link from "next/link";
import { ArrowUpRight, Info, Sprout, Store, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/states/loading-state";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { PreviewChart } from "@/features/dashboard/components/preview-chart";
import { useDashboardPreview } from "@/features/dashboard/hooks/use-dashboard-preview";

const workspaces = [
  {
    label: "Produce",
    description: "Crop information, in one place",
    href: "/produce",
    icon: Sprout,
  },
  {
    label: "Markets",
    description: "A window into local markets",
    href: "/markets",
    icon: Store,
  },
  {
    label: "Recommendations",
    description: "Context for future decisions",
    href: "/recommendations",
    icon: Sparkles,
  },
] as const;

export function DashboardPage() {
  const { data, isPending, isError, refetch } = useDashboardPreview();
  if (isPending) return <LoadingState label="Loading local preview…" />;
  if (isError)
    return (
      <ErrorState
        description="The local preview could not be loaded."
        onRetry={() => void refetch()}
      />
    );

  return (
    <>
      <div className="space-y-3">
        <Badge variant="secondary">GoviNena · Preview workspace</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          A clearer view of what comes next.
        </h1>
        <p className="max-w-2xl leading-7 text-muted-foreground">
          Welcome to your farmer market workspace. Explore the foundation for
          future insights, produce information, and market decision support.
        </p>
      </div>
      <Alert className="border-primary/25 bg-accent/40">
        <Info className="size-4 text-primary" aria-hidden="true" />
        <AlertTitle>Placeholder data only</AlertTitle>
        <AlertDescription>
          All examples below are local fixtures. No live market data, AI
          recommendations, or backend services are connected.
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 md:grid-cols-3">
        {workspaces.map(({ label, description, href, icon: Icon }) => (
          <Card key={href}>
            <CardHeader>
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-lg bg-accent p-2.5 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <Badge variant="outline">Coming soon</Badge>
              </div>
              <CardTitle>{label}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="link" asChild className="h-auto p-0">
                <Link href={href}>
                  Explore placeholder <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Tabs defaultValue="overview">
        <TabsList aria-label="Dashboard views">
          <TabsTrigger value="overview">Preview overview</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
        </TabsList>
        <TabsContent
          value="overview"
          className="mt-5 grid gap-5 xl:grid-cols-2"
        >
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Illustrative trend</CardTitle>
              <CardDescription>
                A chart preview with synthetic values.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreviewChart data={data.trend} />
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Sample market watch</CardTitle>
              <CardDescription>
                Examples of how future market information could be organized.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>
                  Placeholder rows only. No prices or live availability.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produce</TableHead>
                    <TableHead>Market</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.markets.map((row) => (
                    <TableRow key={row.produce}>
                      <TableCell className="font-medium">
                        {row.produce}
                      </TableCell>
                      <TableCell>{row.market}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="updates" className="mt-5">
          <EmptyState
            title="No live updates yet"
            description="Updates and notifications will appear here when the real services are connected."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
