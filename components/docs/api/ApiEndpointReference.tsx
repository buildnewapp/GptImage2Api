import CopyButton from "@/components/shared/CopyButton";
import { Link } from "@/i18n/routing";
import type {
  ApiDocEndpoint,
  ApiDocParameter,
} from "@/lib/apidoc/ai-studio-api-docs";

export type ApiDocTableCopy = {
  name: string;
  type: string;
  required: string;
  defaultValue: string;
  options: string;
  description: string;
  yes: string;
  no: string;
  none: string;
};

export type ApiDocCodeLabels = {
  request: string;
  response: string;
  error: string;
  copy: string;
  copied: string;
};

type Translation = (key: string) => string;

function CodePanel({
  label,
  code,
  codeLabels,
}: {
  label: string;
  code: string;
  codeLabels: ApiDocCodeLabels;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div className="flex min-h-11 items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
          {label}
        </span>
        <CopyButton
          text={code}
          variant="ghost"
          label={codeLabels.copy}
          copiedLabel={codeLabels.copied}
          className="text-white hover:bg-white/10 hover:text-white"
        />
      </div>
      <pre className="max-h-[420px] min-h-0 flex-1 overflow-auto p-4 text-xs leading-6 text-slate-100 sm:text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ParameterTable({
  parameters,
  copy,
  t,
}: {
  parameters: ApiDocParameter[];
  copy: ApiDocTableCopy;
  t: Translation;
}) {
  if (parameters.length === 0) {
    return (
      <p className="rounded-xl border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
        {copy.none}
      </p>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-border/70">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-muted/60 text-xs uppercase tracking-[0.1em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">{copy.name}</th>
            <th className="px-4 py-3 font-semibold">{copy.type}</th>
            <th className="px-4 py-3 font-semibold">{copy.required}</th>
            <th className="px-4 py-3 font-semibold">{copy.defaultValue}</th>
            <th className="px-4 py-3 font-semibold">{copy.options}</th>
            <th className="px-4 py-3 font-semibold">{copy.description}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/65 bg-card/70">
          {parameters.map((parameter) => (
            <tr key={parameter.name}>
              <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                {parameter.name}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {parameter.type}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {parameter.required ? copy.yes : copy.no}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {parameter.defaultValue}
              </td>
              <td className="max-w-[260px] px-4 py-3 text-muted-foreground">
                {parameter.enumValues?.length ? (
                  <span className="block max-h-20 overflow-hidden font-mono text-xs">
                    {parameter.enumValues.join(", ")}
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <span>{t(parameter.descriptionKey)}</span>
                {parameter.descriptionAnchorId &&
                parameter.descriptionAnchorLabelKey ? (
                  <Link
                    href={`/docs/api-models#${parameter.descriptionAnchorId}`}
                    className="ml-1 cursor-pointer font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t(parameter.descriptionAnchorLabelKey)}
                  </Link>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ApiEndpointReference({
  endpoint,
  siteUrl,
  tableCopy,
  codeLabels,
  t,
}: {
  endpoint: ApiDocEndpoint;
  siteUrl: string;
  tableCopy: ApiDocTableCopy;
  codeLabels: ApiDocCodeLabels;
  t: Translation;
}) {
  const curl = endpoint.curl.replaceAll("https://YOUR_DOMAIN", siteUrl);

  return (
    <section className="min-w-0 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-950 px-3 py-1 font-mono text-xs font-semibold text-white">
          {endpoint.method}
        </span>
        <code className="min-w-0 break-all rounded-full border border-border/70 bg-background/80 px-3 py-1 text-sm text-foreground">
          {endpoint.endpoint}
        </code>
        <CopyButton
          text={endpoint.endpoint}
          variant="ghost"
          label={codeLabels.copy}
          copiedLabel={codeLabels.copied}
        />
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
        {t(endpoint.descriptionKey)}
      </p>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">
          {t("endpointLabels.headers")}
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {endpoint.headers.map((header) => (
            <code
              key={header}
              className="break-all rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
            >
              {header}
            </code>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          {t("endpointLabels.parameters")}
        </h2>
        <ParameterTable parameters={endpoint.parameters} copy={tableCopy} t={t} />
      </div>

      <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0 lg:col-span-2">
          <CodePanel
            label={codeLabels.request}
            code={curl}
            codeLabels={codeLabels}
          />
        </div>
        <div className="min-w-0">
          <CodePanel
            label={codeLabels.response}
            code={endpoint.responseExample}
            codeLabels={codeLabels}
          />
        </div>
        <div className="min-w-0">
          <CodePanel
            label={codeLabels.error}
            code={endpoint.errorExample}
            codeLabels={codeLabels}
          />
        </div>
      </div>
    </section>
  );
}
