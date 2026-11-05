"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Check, ExternalLink, ImagePlus, Loader2, Monitor, Smartphone } from "lucide-react";
import { PublicSite, type SiteContent, type SiteEvent } from "@/components/public-site";
import { publicSiteUrl } from "@/lib/dashboard/config";
import { inputClass } from "../../_components/styles";
import { FormError, FormSaved, SubmitButton } from "../../_components/ui";
import { saveSiteAction, unpublishSiteAction, type SiteFormState } from "./actions";

// El editor sigue el diseño de la animación de la landing (components/site-builder.tsx).

type TemplateId = SiteContent["template"];
const TEMPLATE_OPTIONS: { id: TemplateId; name: string; hint: string }[] = [
  { id: "dividida", name: "Dividida", hint: "Info y fechas lado a lado" },
  { id: "portada", name: "Portada", hint: "Banner grande para un evento" },
  { id: "cartelera", name: "Cartelera", hint: "Todas tus fechas juntas" },
];

const TABS = [
  { id: "plantilla", label: "Plantilla" },
  { id: "colores", label: "Colores" },
  { id: "contenido", label: "Contenido" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const SWATCHES = ["#111111", "#52525b", "#a1a1aa", "#7a1428", "#1e3a8a"];
const VALID_COLOR = /^#[0-9a-f]{6}$/i;

// Solo se ven en la vista previa, para mostrar cómo queda antes de cargar eventos.
const SAMPLE_EVENTS: SiteEvent[] = [
  { id: "1", title: "Fiesta de ejemplo", startsAt: "2026-12-12T23:30:00-03:00", venue: "Tu sala" },
  { id: "2", title: "Otra fecha", startsAt: "2026-12-19T23:30:00-03:00", venue: "Tu sala" },
  { id: "3", title: "Fin de año", startsAt: "2026-12-31T23:30:00-03:00", venue: "Tu sala" },
];

// La base puede devolver las claves en otro orden, así que se compara campo por campo.
const sameContent = (a: SiteContent, b: SiteContent | null) =>
  b !== null && (Object.keys(a) as (keyof SiteContent)[]).every((key) => a[key] === b[key]);

function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  const className = "mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-tinta/60";
  return htmlFor ? <label htmlFor={htmlFor} className={className}>{children}</label> : <p className={className}>{children}</p>;
}

function TextField({ label, ...input }: { label: string } & React.ComponentProps<"input">) {
  return (
    <div>
      <Label htmlFor={input.id}>{label}</Label>
      <input {...input} className={inputClass} />
    </div>
  );
}

/** Miniatura en gris: muestra solo la estructura de la plantilla. */
function Wireframe({ id }: { id: TemplateId }) {
  const block = "rounded-[2px] bg-tinta/20";
  const strong = "rounded-[2px] bg-tinta/45";
  return (
    <span className="flex h-12 w-16 shrink-0 flex-col gap-[3px] overflow-hidden rounded-md border border-tinta/10 bg-white p-1.5">
      {id === "dividida" && (
        <span className="flex flex-1 gap-[3px]">
          <span className="flex w-1/2 flex-col gap-[3px]">
            <span className={`h-1.5 w-full ${strong}`} />
            <span className={`h-1 w-2/3 ${block}`} />
            <span className={`mt-auto h-1.5 w-1/2 ${strong}`} />
          </span>
          <span className={`flex-1 ${block}`} />
        </span>
      )}
      {id === "portada" && (
        <>
          <span className={`flex h-1/2 items-center justify-center ${strong}`}>
            <span className="h-1 w-1/2 rounded-full bg-white/80" />
          </span>
          <span className="flex flex-1 gap-[3px]">
            <span className={`flex-1 ${block}`} />
            <span className={`w-1/3 ${block}`} />
          </span>
        </>
      )}
      {id === "cartelera" && (
        <>
          <span className="grid flex-1 grid-cols-3 gap-[3px]">
            <span className={strong} />
            <span className={block} />
            <span className={block} />
          </span>
          <span className="flex h-1/3 gap-[3px]">
            <span className={`flex-1 ${block}`} />
            <span className={`w-1/3 ${block}`} />
          </span>
        </>
      )}
    </span>
  );
}

function Segmented<V extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: V;
  options: { value: V; label: ReactNode }[];
  onChange: (value: V) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-tinta/5 p-1 text-xs font-medium">
      {options.map((option) => (
        <label
          key={option.value}
          className={`cursor-pointer rounded-md py-1.5 text-center transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-palco-300 ${
            value === option.value ? "bg-white text-tinta shadow-sm" : "text-tinta/60"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

// Baja el logo a un tamaño razonable en el navegador: se guarda con el sitio, no como archivo aparte.
async function logoToDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 480 / bitmap.width, 240 / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/png");
}

// La portada ocupa todo el ancho: se achica hasta que pese lo que acepta el servidor.
async function coverToDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    for (const [maxWidth, quality] of [[1800, 0.82], [1400, 0.75], [1000, 0.7]]) {
      const scale = Math.min(1, maxWidth / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= 1_100_000) return dataUrl;
    }
    throw new Error("Imagen demasiado pesada");
  } finally {
    bitmap.close();
  }
}

type Device = "escritorio" | "celular";
const DEVICE_WIDTH: Record<Device, number> = { escritorio: 1200, celular: 390 };

// Pinta la página a su ancho real y la achica para que entre: así se ve igual que en internet.
function DevicePreview({ device, children }: { device: Device; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const width = DEVICE_WIDTH[device];
  const zoom = available ? Math.min(1, available / width) : 1;
  return (
    <div ref={ref} className="max-h-[70vh] overflow-y-auto overflow-x-hidden bg-tinta/5">
      <div className="mx-auto" style={{ width, zoom }}>{children}</div>
    </div>
  );
}

function PublishButton({ published }: { published: boolean }) {
  const { pending, data } = useFormStatus();
  const publishing = pending && data?.get("intent") === "publish";
  return (
    <button
      type="submit"
      name="intent"
      value="publish"
      disabled={pending}
      className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition disabled:opacity-70 ${
        published && !publishing ? "bg-emerald-700" : "bg-palco-800 hover:bg-palco-700"
      }`}
    >
      {publishing ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden /> Publicando…
        </>
      ) : published ? (
        <>
          <Check className="size-4" aria-hidden /> Publicada
        </>
      ) : (
        "Publicar"
      )}
    </button>
  );
}

function SaveDraftButton() {
  const { pending, data } = useFormStatus();
  const saving = pending && data?.get("intent") === "save";
  return (
    <button
      type="submit"
      name="intent"
      value="save"
      disabled={pending}
      className="inline-flex items-center gap-1 text-xs font-medium text-tinta/70 underline disabled:opacity-60"
    >
      {saving && <Loader2 className="size-3 animate-spin" aria-hidden />}
      Guardar borrador
    </button>
  );
}

export function SiteEditor({
  slug,
  initial,
  published,
  events,
}: {
  slug: string;
  initial: SiteContent;
  published: SiteContent | null;
  events: SiteEvent[];
}) {
  const [state, action] = useActionState(saveSiteAction, {} as SiteFormState);
  const [site, setSite] = useState(initial);
  const [tab, setTab] = useState<TabId>("plantilla");
  const [device, setDevice] = useState<Device>("escritorio");
  const [logoError, setLogoError] = useState("");
  const [coverError, setCoverError] = useState("");
  const [handled, setHandled] = useState(state);

  // El servidor normaliza algunos campos (la web, el usuario de Instagram): se muestra lo guardado.
  if (state !== handled) {
    setHandled(state);
    if (state.site) setSite(state.site);
  }

  const set = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) =>
    setSite((current) => ({ ...current, [key]: value }));
  const onText = (key: keyof SiteContent) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(key, event.target.value);

  async function onLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLogoError("");
    try {
      set("logo", await logoToDataUrl(file));
    } catch {
      setLogoError("No pudimos leer esa imagen. Probá con un PNG o JPG.");
    }
  }

  async function onCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCoverError("");
    try {
      set("cover", await coverToDataUrl(file));
    } catch {
      setCoverError("No pudimos usar esa imagen. Probá con un JPG más liviano.");
    }
  }

  const url = publicSiteUrl(slug);
  const validColor = VALID_COLOR.test(site.primaryColor);
  const preview = { ...site, primaryColor: validColor ? site.primaryColor : "#111111" };
  const upToDate = sameContent(site, published);

  return (
    <div className="overflow-hidden rounded-2xl border border-tinta/10 bg-white shadow-sm">
      <div className="grid md:grid-cols-[310px_minmax(0,1fr)]">
        {/* noValidate: un campo inválido puede estar en otra pestaña, así que valida el servidor. */}
        <form action={action} noValidate className="flex flex-col border-b border-tinta/10 bg-papel/30 p-4 md:border-b-0 md:border-r">
          <div role="tablist" aria-label="Secciones del editor" className="grid grid-cols-3 gap-0.5 rounded-lg bg-tinta/5 p-1 text-[11px] font-medium">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-md py-1.5 text-center transition ${
                  tab === item.id ? "bg-white text-tinta shadow-sm" : "text-tinta/60 hover:text-tinta"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <input type="hidden" name="logo" value={site.logo} />
          <input type="hidden" name="cover" value={site.cover} />

          {/* Las pestañas se ocultan sin desmontarse: todo tiene que viajar en el formulario. */}
          <div className="mt-4 min-h-[330px] flex-1">
            <div hidden={tab !== "plantilla"}>
              <Label>Elegí un diseño</Label>
              <div className="space-y-2">
                {TEMPLATE_OPTIONS.map((option) => {
                  const active = site.template === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-2 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-palco-300 ${
                        active ? "border-palco-700 ring-2 ring-palco-700/20" : "border-tinta/10 hover:border-tinta/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="template"
                        value={option.id}
                        checked={active}
                        onChange={() => set("template", option.id)}
                        className="sr-only"
                      />
                      <Wireframe id={option.id} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-tinta">{option.name}</span>
                        <span className="block text-[11px] text-tinta/60">{option.hint}</span>
                      </span>
                      {active && <Check className="size-4 text-palco-700" aria-hidden />}
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-tinta/60">
                Tres diseños base. Colores, tipografía y logo los elegís vos.
              </p>
            </div>

            <div hidden={tab !== "colores"} className="space-y-5">
              <div>
                <Label>Fondo</Label>
                <Segmented
                  name="background"
                  value={site.background}
                  onChange={(value) => set("background", value)}
                  options={[
                    { value: "claro", label: "Claro" },
                    { value: "oscuro", label: "Oscuro" },
                  ]}
                />
              </div>
              <div>
                <Label htmlFor="primaryColor">Color principal</Label>
                <div className="flex items-center gap-2">
                  {SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Usar el color ${color}`}
                      aria-pressed={site.primaryColor.toLowerCase() === color}
                      onClick={() => set("primaryColor", color)}
                      style={{ background: color }}
                      className="size-7 rounded-full transition aria-pressed:ring-2 aria-pressed:ring-tinta aria-pressed:ring-offset-2"
                    />
                  ))}
                </div>
                <div className="mt-2.5 flex h-9 items-center gap-2 rounded-lg border border-tinta/15 bg-white px-2 text-sm transition focus-within:border-palco-700 focus-within:ring-2 focus-within:ring-palco-700/15">
                  <span className="size-5 shrink-0 rounded-md border border-tinta/10" style={{ background: preview.primaryColor }} />
                  <input
                    id="primaryColor"
                    name="primaryColor"
                    spellCheck={false}
                    maxLength={7}
                    value={site.primaryColor}
                    onChange={onText("primaryColor")}
                    className="w-20 bg-transparent font-mono text-xs uppercase outline-none"
                  />
                  <span className="ml-auto text-[10px] text-tinta/60">o el de tu marca</span>
                </div>
                {!validColor && <p className="mt-1 text-xs text-palco-700">Usá el formato #RRGGBB.</p>}
              </div>
              <div>
                <Label>Tipografía de títulos</Label>
                <Segmented
                  name="titleFont"
                  value={site.titleFont}
                  onChange={(value) => set("titleFont", value)}
                  options={[
                    { value: "clasica", label: <span className="font-serif text-[13px]">Clásica</span> },
                    { value: "moderna", label: <span className="font-black uppercase tracking-tight">Moderna</span> },
                  ]}
                />
              </div>
            </div>

            <div hidden={tab !== "contenido"} className="space-y-3">
              <TextField label="Nombre" id="displayName" name="displayName" maxLength={80} value={site.displayName} onChange={onText("displayName")} />
              <div>
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-tinta/25 bg-white px-3 py-2 text-xs font-medium text-tinta/70 transition hover:border-tinta/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-palco-300">
                    <ImagePlus className="size-4" aria-hidden />
                    {site.logo ? "Cambiar logo" : "Subir logo"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogo} className="sr-only" />
                  </label>
                  {site.logo && (
                    <button type="button" onClick={() => set("logo", "")} className="text-xs text-tinta/70 underline">
                      Quitar
                    </button>
                  )}
                </div>
                <FormError message={logoError} />
              </div>
              <div>
                <Label>Imagen de portada</Label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-tinta/25 bg-white px-3 py-2 text-xs font-medium text-tinta/70 transition hover:border-tinta/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-palco-300">
                    <ImagePlus className="size-4" aria-hidden />
                    {site.cover ? "Cambiar portada" : "Subir portada"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onCover} className="sr-only" />
                  </label>
                  {site.cover && (
                    <button type="button" onClick={() => set("cover", "")} className="text-xs text-tinta/70 underline">
                      Quitar
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-tinta/60">Una foto horizontal de tu sala o de tu evento.</p>
                <FormError message={coverError} />
              </div>
              <TextField label="Frase principal" id="tagline" name="tagline" maxLength={140} value={site.tagline} onChange={onText("tagline")} />
              <div>
                <Label htmlFor="about">Presentación</Label>
                <textarea id="about" name="about" rows={3} maxLength={1000} value={site.about} onChange={onText("about")} className={inputClass} />
              </div>
              <TextField label="Dirección" id="address" name="address" maxLength={160} value={site.address} onChange={onText("address")} />
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Teléfono" id="phone" name="phone" maxLength={40} value={site.phone} onChange={onText("phone")} />
                <TextField label="Instagram" id="instagram" name="instagram" placeholder="@usuario" value={site.instagram} onChange={onText("instagram")} />
              </div>
              <TextField label="Email" id="email" name="email" type="email" maxLength={120} value={site.email} onChange={onText("email")} />
              <TextField label="Web" id="website" name="website" placeholder="tuweb.com" value={site.website} onChange={onText("website")} />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <FormError message={state.error} />
            <PublishButton published={upToDate} />
            <div className="flex min-h-5 items-center justify-between gap-2">
              <SaveDraftButton />
              <FormSaved show={!state.error && state.done === "saved"}>
                <span className="text-xs">Guardado</span>
              </FormSaved>
            </div>
          </div>
        </form>

        <div className="min-w-0 bg-tinta/[0.03] p-4 sm:p-6">
          <div className="relative overflow-hidden rounded-xl border border-tinta/10 shadow-sm">
            <div className="flex items-center gap-2 border-b border-black/5 bg-white px-3 py-2">
              <span className="flex-1 truncate rounded-md bg-tinta/5 px-3 py-1 text-center text-[11px] text-tinta/60">
                {url.replace(/^https?:\/\//, "")}
              </span>
              <div className="flex shrink-0 gap-0.5 rounded-md bg-tinta/5 p-0.5">
                {([
                  ["escritorio", Monitor, "Ver como en la computadora"],
                  ["celular", Smartphone, "Ver como en el celular"],
                ] as const).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-label={label}
                    title={label}
                    aria-pressed={device === id}
                    onClick={() => setDevice(id)}
                    className={`rounded p-1 transition ${device === id ? "bg-white text-tinta shadow-sm" : "text-tinta/60 hover:text-tinta"}`}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </button>
                ))}
              </div>
            </div>
            <DevicePreview device={device}>
              <div key={site.template} className="[animation:subir_0.5s_ease-out_both]">
                <PublicSite site={preview} events={events.length > 0 ? events : SAMPLE_EVENTS} className="min-h-[640px]" />
              </div>
            </DevicePreview>
            {state.done === "published" && upToDate && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                <span role="status" className="flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-xs font-medium text-white shadow-lg [animation:subir_0.5s_ease-out_both]">
                  <Check className="size-3.5" aria-hidden /> Tu web está online
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-tinta/70">
            <p>
              {events.length === 0 ? "Las fechas son de ejemplo. El público no las ve. " : ""}
              {!published ? "Todavía no está publicada." : upToDate ? "" : "Tenés cambios sin publicar."}
            </p>
            {published && (
              <div className="flex items-center gap-3">
                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                  Ver página
                  <ExternalLink className="size-3" aria-hidden />
                </a>
                <form action={unpublishSiteAction}>
                  <SubmitButton variant="danger" className="!px-2 !py-1 !text-xs" confirm="¿Sacar la página de internet? El borrador queda guardado.">
                    Despublicar
                  </SubmitButton>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
