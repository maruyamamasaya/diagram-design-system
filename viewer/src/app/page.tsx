"use client";
import { useEffect, useState } from "react";
import DiagramCanvas from "@/components/DiagramCanvas";
type Diagram = {
  id: string;
  title: string;
  type: string;
  tags: string[];
  version: number;
  formats: string[];
  updatedAt: string;
  validationChecks: Record<string, string>;
  unverified?: string[];
  pageCount: number;
};
const types: Record<string, string> = {
  roadmap: "Roadmap",
  flowchart: "Flowchart",
  architecture: "Architecture",
  comparison: "Comparison",
  presentation: "プレゼン",
};
async function call(path: string, csrf: string, body?: unknown) {
  const res = await fetch(`/api/web/${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    headers: body
      ? { "Content-Type": "application/json", "X-CSRF-Token": csrf }
      : {},
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok)
    throw Error(
      res.status === 401
        ? "認証が必要です。ログインしてください。"
        : res.status === 429
          ? "操作が多いため、少し待ってから再試行してください。"
          : data.error?.code === "STORAGE_UNAVAILABLE"
            ? "資料を取得できません。接続設定を確認してください。"
            : "操作を完了できませんでした。",
    );
  return data;
}
function Thumbnail({ diagram, csrf }: { diagram: Diagram; csrf: string }) {
  const [url, setUrl] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    call(`diagrams/${diagram.id}/access-url`, csrf, {
      version: diagram.version,
      artifact: "png",
      purpose: "preview",
    })
      .then((d) => {
        if (active) setUrl(d.url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [diagram.id, diagram.version, csrf]);
  return (
    <div className="thumbnail">
      {failed ? (
        <span>プレビューを取得できません</span>
      ) : url ? (
        <img
          src={url}
          alt={`${diagram.title}のPNGプレビュー`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>読み込み中…</span>
      )}
    </div>
  );
}
export default function Home() {
  const [csrf, setCsrf] = useState(""),
    [password, setPassword] = useState(""),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState(""),
    [items, setItems] = useState<Diagram[]>([]),
    [q, setQ] = useState(""),
    [type, setType] = useState(""),
    [cursor, setCursor] = useState<string | null>(null),
    [selected, setSelected] = useState<Diagram | null>(null),
    [url, setUrl] = useState(""),
    [format, setFormat] = useState("png"),
    [refresh, setRefresh] = useState(0),
    [pageNumber, setPageNumber] = useState(1);
  useEffect(() => {
    call("session", "")
      .then((d) => setCsrf(d.csrf))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!csrf) return;
    const abort = new AbortController();
    setLoading(true);
    setMessage("");
    const timer = setTimeout(() => {
      fetch(`/api/web/diagrams?q=${encodeURIComponent(q)}&type=${type}`, {
        signal: abort.signal,
        cache: "no-store",
      })
        .then(async (r) => {
          if (!r.ok)
            throw Error(
              "一覧を取得できません。再ログインまたは接続設定を確認してください。",
            );
          return r.json();
        })
        .then((d) => {
          setItems(d.items);
          setCursor(d.nextCursor);
        })
        .catch((e) => {
          if (e.name !== "AbortError") setMessage(e.message);
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [csrf, q, type, refresh]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    let retried = false;
    setUrl("");
    call(`diagrams/${selected.id}/access-url`, csrf, {
      version: selected.version,
      artifact: format,
      page:pageNumber,
      purpose: "preview",
    })
      .then((d) => {
        if (active) setUrl(d.url);
      })
      .catch((e) => {
        if (active && !retried) {
          retried = true;
          setMessage(e.message);
        }
      });
    return () => {
      active = false;
    };
  }, [selected, format, pageNumber, csrf, refresh]);
  const reset = () => {
    setCsrf("");
    setSelected(null);
    setUrl("");
    setItems([]);
    setPassword("");
  };
  return (
    <main>
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <div>
            <span className="eyebrow">DIAGRAM DESIGN SYSTEM</span>
            <h1>資料ライブラリ</h1>
          </div>
        </div>
        {csrf && (
          <button
            onClick={async () => {
              try {
                await call("logout", csrf, {});
              } finally {
                reset();
              }
            }}
          >
            ログアウト
          </button>
        )}
      </header>
      {message && (
        <div className="error" role="alert">
          {message}
          <button onClick={() => setRefresh((v) => v + 1)}>再試行</button>
        </div>
      )}
      {!csrf ? (
        <section className="login">
          <span className="eyebrow">PRIVATE LIBRARY</span>
          <h2>ライブラリにログイン</h2>
          <p>保存した資料を安全に閲覧します。</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setMessage("");
              try {
                const d = await call("login", "", { password });
                setCsrf(d.csrf);
                setPassword("");
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="primary" disabled={loading}>
              {loading ? "確認中…" : "ログイン"}
            </button>
          </form>
        </section>
      ) : selected ? (
        <>
          <nav className="breadcrumb">
            <button
              onClick={() => {
                setSelected(null);
                setUrl("");
                setFormat("png");
              }}
            >
              ← 一覧へ戻る
            </button>
            <span>
              {types[selected.type]} · v{selected.version}
            </span>
          </nav>
          <div className="detail-heading">
            <div>
              <h2>{selected.title}</h2>
              <p className="muted">
                {selected.tags.join(" / ")} · {selected.updatedAt.slice(0, 10)}
              </p>
            </div>
            <div className="actions">
              {selected.formats.filter(f=>["png","svg","pdf","pptx"].includes(f)).map((f) => (
                <button
                  key={f}
                  onClick={async () => {
                    try {
                      const d = await call(
                        `diagrams/${selected.id}/access-url`,
                        csrf,
                        {
                          version: selected.version,
                          artifact: f,
                          page:pageNumber,
                          purpose: "download",
                        },
                      );
                      const a = document.createElement("a");
                      a.href = d.url;
                      a.rel = "noreferrer";
                      a.download = d.fileName;
                      a.click();
                    } catch (e) {
                      setMessage((e as Error).message);
                    }
                  }}
                >
                  {f.toUpperCase()}をダウンロード
                </button>
              ))}
            </div>
          </div>
          <div className="preview-options">
            {selected.formats.filter(f=>['png','svg','pdf'].includes(f)).map(f=>(
              <button key={f} aria-pressed={format===f} onClick={()=>setFormat(f)}>{f.toUpperCase()}表示</button>
            ))}
            {selected.pageCount>1 && format!=="pdf" && <label>ページ
              <select value={pageNumber} onChange={e=>setPageNumber(Number(e.target.value))}>
                {Array.from({length:selected.pageCount},(_,i)=><option key={i+1} value={i+1}>{i+1} / {selected.pageCount}</option>)}
              </select>
            </label>}
          </div>
          {url ? format==='pdf' ? (
            <section className="pdf-preview">
              <iframe src={url} title={`${selected.title}のPDF`} referrerPolicy="no-referrer" />
              <p className="hint"><a href={url} target="_blank" rel="noreferrer">PDFを別タブで開く</a></p>
            </section>
          ) : (
            <DiagramCanvas url={url} title={`${selected.title} ${pageNumber}/${selected.pageCount}`}
              onImageError={()=>{setUrl('');setMessage('表示URLが失効したか、画像を取得できません。再試行してください。');}} />
          ) : (<div className="placeholder" role="status">プレビューを読み込み中…</div>)}
          {selected.formats.includes('pptx') && <p className="hint">PPTXの内容はページPNGで確認できます。編集にはダウンロードしたファイルをPowerPoint等で開いてください。</p>}
          <details className="validation">
            <summary>検証結果と未検証項目</summary>
            <dl>
              {Object.entries(selected.validationChecks).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </details>
        </>
      ) : (
        <>
          <section className="intro">
            <div>
              <span className="eyebrow">YOUR COLLECTION</span>
              <h2>保存した資料</h2>
              <p className="muted">技術・業務の資料を、すぐに見つける。</p>
            </div>
            <span className="count">
              {items.length}件{cursor ? "以上" : ""}
            </span>
          </section>
          <section className="filters" aria-label="検索と絞り込み">
            <label>
              タイトル・タグ検索
              <input
                type="search"
                placeholder="例：Linux、コマンド"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                maxLength={100}
              />
            </label>
            <label>
              資料タイプ
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">すべてのタイプ</option>
                {Object.entries(types).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </section>
          {loading ? (
            <p role="status">読み込み中…</p>
          ) : !items.length ? (
            <div className="empty">該当する資料がありません。</div>
          ) : (
            <div className="grid">
              {items.map((d) => (
                <article key={d.id}>
                  <button
                    className="card"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        setPageNumber(1);setFormat(d.formats.includes("png")?"png":d.formats[0]);
                        setSelected(
                          await call(
                            `diagrams/${d.id}?version=${d.version}`,
                            csrf,
                          ),
                        );
                      } catch (e) {
                        setMessage((e as Error).message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <Thumbnail diagram={d} csrf={csrf} />
                    <div className="card-body">
                      <span className="eyebrow">
                        {types[d.type]} · v{d.version}
                      </span>
                      <h3>{d.title}</h3>
                      <div className="tags">
                        {d.tags.map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </div>
                      <p className="muted">
                        {d.updatedAt.slice(0, 10)} <span>資料を開く →</span>
                      </p>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          )}
          {cursor && (
            <button
              onClick={async () => {
                try {
                  const d = await call(
                    `diagrams?q=${encodeURIComponent(q)}&type=${type}&cursor=${encodeURIComponent(cursor)}`,
                    csrf,
                  );
                  setItems((old) => [...old, ...d.items]);
                  setCursor(d.nextCursor);
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              さらに表示
            </button>
          )}
        </>
      )}
      <footer>
        非公開ライブラリ · 形式別ダウンロード · プレゼンはページごとに表示
      </footer>
    </main>
  );
}
