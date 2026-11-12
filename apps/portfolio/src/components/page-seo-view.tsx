import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { localSeoImage, type PageSeo, seoValue } from "@/src/lib/page-seo";
import { ORIGIN } from "@/src/lib/site";

function hostLabel(value: string): string {
  try {
    return new URL(value || ORIGIN, `${ORIGIN}/`).host || new URL(ORIGIN).host;
  } catch {
    return new URL(ORIGIN).host;
  }
}

function SharePreview({ data, path }: { data: PageSeo; path: string }) {
  const image = seoValue(data, "og:image");
  const imagePath = localSeoImage(image, path);
  const [imageFailed, setImageFailed] = useState(false);
  const title = seoValue(data, "og:title") || seoValue(data, "title");
  const description = seoValue(data, "og:description") || seoValue(data, "description");
  const url = seoValue(data, "og:url") || seoValue(data, "canonical");
  const imageMessage = !image
    ? "No og:image is declared for this page."
    : imageFailed
      ? "The Open Graph image could not be loaded."
      : "Only same-site Open Graph images are loaded here.";
  return (
    <section className="page-seo-share" aria-labelledby="page-seo-share-title">
      <p className="site-file-label">SOCIAL / OPEN GRAPH</p>
      <h2 id="page-seo-share-title" className="site-file-rendered-title">
        Share preview
      </h2>
      <p className="site-file-rendered-description">
        An illustrative card based on the page's published tags. Platforms may display it
        differently.
      </p>
      <div className="page-seo-card">
        {imagePath && !imageFailed ? (
          <Image
            className="page-seo-image"
            src={imagePath}
            alt={seoValue(data, "og:image:alt") || "Open Graph image"}
            width={1200}
            height={630}
            unoptimized
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="page-seo-image-placeholder">
            <ImageOff size={20} aria-hidden="true" />
            <span>{imageMessage}</span>
          </div>
        )}
        <div className="page-seo-card-copy">
          <span className="page-seo-card-host">{hostLabel(url)}</span>
          <strong>{title || "No title specified"}</strong>
          <p>{description || "No description specified"}</p>
        </div>
      </div>
    </section>
  );
}

function MetadataList({ data }: { data: PageSeo }) {
  return (
    <section className="page-seo-tags" aria-labelledby="page-seo-tags-title">
      <div className="site-file-rendered-header">
        <div>
          <p className="site-file-label">DOCUMENT / HEAD</p>
          <h2 id="page-seo-tags-title" className="site-file-rendered-title">
            Published metadata
          </h2>
          <p className="site-file-rendered-description">Values read from the page's HTML head.</p>
        </div>
        <span className="site-file-count">{data.tags.length} tags</span>
      </div>
      {data.tags.length ? (
        <dl className="page-seo-tag-list">
          {data.tags.map((tag, index) => (
            // A head may contain repeated tags, and their original order matters.
            // biome-ignore lint/suspicious/noArrayIndexKey: the entire page metadata is replaced together.
            <div className="page-seo-tag" key={`${tag.name}-${index}`}>
              <dt>{tag.name}</dt>
              <dd>{tag.value || <em>Empty</em>}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="site-file-rendered-description">No title or metadata tags were found.</p>
      )}
    </section>
  );
}

export default function PageSeoView({ data, path }: { data: PageSeo; path: string }) {
  return (
    <div className="page-seo-rendered">
      <SharePreview data={data} path={path} />
      <MetadataList data={data} />
    </div>
  );
}
