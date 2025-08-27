import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layout } from "./Layout";

interface PlaceholderPageProps {
  title: string;
  description: string;
  features?: string[];
}

export function PlaceholderPage({ title, description, features = [] }: PlaceholderPageProps) {
  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {features.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Planned Features:</h4>
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  This page is coming soon! Continue prompting to have me build it for you.
                </p>
                <Button variant="outline">Request This Feature</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
