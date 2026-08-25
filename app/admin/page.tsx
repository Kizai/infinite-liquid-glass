"use client";

import { useEffect, useState } from "react";
import "./admin.css";
import {
  configFileName,
  DEFAULT_TEXT,
  MAX_UPLOAD_BYTES,
  UPLOAD_ENDPOINT,
  type Slide,
} from "../lib/gallery";

type Tone = "idle" | "busy" | "ok" | "error";
type Status = { tone: Tone; message: string };

function seedSlides(): Slide[] {
  return DEFAULT_TEXT.map((text) => ({
    ...text,
    mediaUrl: "",
    mediaType: "image" as const,
  }));
}

export default function AdminPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [status, setStatus] = useState<Status>({ tone: "idle", message: "" });
  const [uploading, setUploading] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/config", { cache: "no-store" });
        const data = res.ok ? await res.json() : null;
        if (!active) return;
        if (data && Array.isArray(data.slides) && data.slides.length > 0) {
          setSlides(data.slides);
        } else {
          setSlides(seedSlides());
        }
      } catch {
        if (active) setSlides(seedSlides());
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const update = (index: number, patch: Partial<Slide>) =>
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const move = (index: number, dir: -1 | 1) =>
    setSlides((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  const remove = (index: number) =>
    setSlides((prev) => prev.filter((_, i) => i !== index));

  const add = () =>
    setSlides((prev) => [
      ...prev,
      {
        ...DEFAULT_TEXT[prev.length % DEFAULT_TEXT.length],
        mediaUrl: "",
        mediaType: "image" as const,
      },
    ]);

  async function handleUpload(index: number, file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      setStatus({
        tone: "error",
        message: `文件超过 100MB 限制（${(file.size / 1024 / 1024).toFixed(1)}MB）`,
      });
      return;
    }
    setUploading(index);
    setStatus({ tone: "busy", message: "正在上传媒体…" });
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const renamed = `ilg-media-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const form = new FormData();
      form.append("file", file, renamed);
      const res = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        throw new Error(data?.msg || `上传失败（HTTP ${res.status}）`);
      }
      const mediaType = file.type.startsWith("video") ? "video" : "image";
      update(index, { mediaUrl: data.url as string, mediaType });
      setStatus({ tone: "ok", message: "媒体已上传" });
    } catch (cause) {
      setStatus({
        tone: "error",
        message: cause instanceof Error ? cause.message : "上传失败",
      });
    } finally {
      setUploading(null);
    }
  }

  async function publish() {
    setStatus({ tone: "busy", message: "正在发布配置…" });
    try {
      // The image host never overwrites an existing name, so read the current
      // latest version and write the next one.
      const meta = await fetch("/api/config", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ latestVersion: 0 }));
      const nextVersion = (Number(meta?.latestVersion) || 0) + 1;
      const name = configFileName(nextVersion);
      const config = { version: 1, slides };
      const file = new File([JSON.stringify(config, null, 2)], name, {
        type: "application/json",
      });
      const form = new FormData();
      form.append("file", file, name);
      const res = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        throw new Error(data?.msg || `发布失败（HTTP ${res.status}）`);
      }
      setStatus({ tone: "ok", message: `已发布 v${nextVersion}，刷新首页即可看到更新` });
    } catch (cause) {
      setStatus({
        tone: "error",
        message: cause instanceof Error ? cause.message : "发布失败",
      });
    }
  }

  return (
    <div className="admin">
      <div className="admin__inner">
        <h1>无限液态玻璃 · 内容管理</h1>
        <p className="admin__lead">
          上传你喜欢的图片或视频（单个 ≤ 100MB），编辑文字，展示位数量不限。
          保存后会发布到你的图床，首页会自动读取最新配置。视频将自动静音循环播放。
        </p>

        <div className="admin__bar">
          <button
            className="admin__btn admin__btn--primary"
            onClick={publish}
            disabled={!loaded || uploading !== null}
          >
            保存并发布
          </button>
          <button className="admin__btn" onClick={add}>
            添加展示位（当前 {slides.length} 个）
          </button>
          {status.message ? (
            <span className={`admin__status admin__status--${status.tone}`}>
              {status.message}
            </span>
          ) : null}
        </div>

        {!loaded ? (
          <p className="admin__lead">加载中…</p>
        ) : (
          <div className="admin__grid">
            {slides.map((slide, index) => (
              <div className="card" key={index}>
                <div className="card__media">
                  {slide.mediaUrl ? (
                    slide.mediaType === "video" ? (
                      <video src={slide.mediaUrl} muted loop playsInline autoPlay />
                    ) : (
                      <img src={slide.mediaUrl} alt="" />
                    )
                  ) : (
                    <div className="card__placeholder">未选择媒体</div>
                  )}
                  <label className="card__upload">
                    {uploading === index ? "上传中…" : "选择图片 / 视频"}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      disabled={uploading !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void handleUpload(index, file);
                      }}
                    />
                  </label>
                </div>
                <div className="card__fields">
                  <label className="field">
                    <span>编号</span>
                    <input
                      value={slide.code}
                      onChange={(e) => update(index, { code: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>分类</span>
                    <input
                      value={slide.category}
                      onChange={(e) => update(index, { category: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>标题</span>
                    <input
                      value={slide.title}
                      onChange={(e) => update(index, { title: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>副标题</span>
                    <input
                      value={slide.subtitle}
                      onChange={(e) => update(index, { subtitle: e.target.value })}
                    />
                  </label>
                  <div className="card__row">
                    <button
                      className="admin__btn admin__btn--ghost"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                    >
                      上移
                    </button>
                    <button
                      className="admin__btn admin__btn--ghost"
                      onClick={() => move(index, 1)}
                      disabled={index === slides.length - 1}
                    >
                      下移
                    </button>
                    <button
                      className="admin__btn admin__btn--danger"
                      onClick={() => remove(index)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
