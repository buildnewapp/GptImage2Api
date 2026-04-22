import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { previewConfig } from "@/lib/db/config";
import {
  Database,
  Globe,
  Link as LinkIcon,
  Network,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const DatabaseConfigPreview = () => {
  const isCloudflare = process.env.DEPLOYMENT_PLATFORM === 'cloudflare';
  const hasHyperdrive = isCloudflare; // Hyperdrive is configured in wrangler.jsonc
  
  // For Cloudflare with Hyperdrive: DATABASE_URL is not needed (provided by Hyperdrive binding)
  // For other platforms: DATABASE_URL is required
  if (!process.env.DATABASE_URL && !hasHyperdrive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Database Configuration</CardTitle>
          <CardDescription>
            DATABASE_URL environment variable is not set.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Use DATABASE_URL for preview, or default to Supabase-like string for Hyperdrive detection
  const connectionString = process.env.DATABASE_URL || 
    (hasHyperdrive ? 'postgresql://hyperdrive@db.supabase.co:5432/postgres' : '');
  
  const configPreview = previewConfig({
    connectionString,
  });

  const { platform, database, summary } = configPreview;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Environment Status</CardTitle>
        <CardDescription>
          Auto-detected configuration for the current deployment.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>Deployment Platform</span>
          </div>
          <Badge variant="outline" className="font-mono capitalize w-fit">
            {platform}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-4 w-4" />
            <span>Database Provider</span>
          </div>
          <Badge variant="outline" className="font-mono capitalize w-fit">
            {database}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Server className="h-4 w-4" />
            <span>Environment Type</span>
          </div>
          {summary.isServerless ? (
            <Badge variant="secondary" className="w-fit">
              Serverless
            </Badge>
          ) : (
            <Badge variant="default" className="w-fit">
              Server
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <LinkIcon className="h-4 w-4" />
            <span>Connection Pooling</span>
          </div>
          {summary.connectionPooling ? (
            <Badge variant="default" className="w-fit">
              Enabled
            </Badge>
          ) : (
            <Badge variant="secondary" className="w-fit">
              Disabled (Single Connection)
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span>Prepared Statements</span>
          </div>
          {summary.preparedStatements ? (
            <Badge variant="default" className="w-fit">
              Enabled
            </Badge>
          ) : (
            <Badge variant="secondary" className="w-fit">
              Disabled
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span>SSL/TLS</span>
          </div>
          {summary.requiresSSL ? (
            <Badge variant="default" className="w-fit">
              Required
            </Badge>
          ) : (
            <Badge variant="secondary" className="w-fit">
              Not Required
            </Badge>
          )}
        </div>

        {process.env.DEPLOYMENT_PLATFORM === "cloudflare" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Network className="h-4 w-4" />
              <span>CF Connection Mode</span>
            </div>
            {summary.isHyperdrive ? (
              <Badge variant="default" className="w-fit">
                Hyperdrive
              </Badge>
            ) : platform === "cloudflare" ? (
              <Badge variant="secondary" className="w-fit">
                Neon HTTP
              </Badge>
            ) : (
              <Badge variant="outline" className="w-fit">
                Direct TCP
              </Badge>
            )}
          </div>
        ) : (
          <></>
        )}
      </CardContent>
    </Card>
  );
};
