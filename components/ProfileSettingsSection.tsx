"use client";

import { useEffect, useState } from "react";
import { getSetting, setSetting } from "@/lib/db";
import {
  defaultUserProfile,
  parseUserProfileJson,
  type UserProfile,
} from "@/lib/userProfile";
import {
  loadUserProfileFormFromStorage,
  saveUserProfileFormToStorage,
} from "@/lib/uiPersist";

export function ProfileSettingsSection() {
  const [p, setP] = useState<UserProfile>(defaultUserProfile);
  const [saved, setSaved] = useState(false);
  const [formReady, setFormReady] = useState(false);

  useEffect(() => {
    const fromForm = loadUserProfileFormFromStorage();
    if (fromForm) {
      setP(fromForm);
      setFormReady(true);
      return;
    }
    void getSetting("userProfile").then((raw) => {
      setP(parseUserProfileJson(raw));
      setFormReady(true);
    });
  }, []);

  useEffect(() => {
    if (!formReady) return;
    saveUserProfileFormToStorage(p);
  }, [p, formReady]);

  async function save() {
    await setSetting("userProfile", JSON.stringify(p));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="mt-4">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        からだの情報
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        メニュー提案の精度用です。筋肥大・フルジム・セッション60〜90分はアプリ側の前提として送信されます。
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            性別
          </span>
          <select
            value={p.gender}
            onChange={(e) =>
              setP({
                ...p,
                gender: e.target.value as UserProfile["gender"],
              })
            }
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="unspecified">未設定</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">その他</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            年齢
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            placeholder="歳"
            value={p.ageYears ?? ""}
            onChange={(e) =>
              setP({
                ...p,
                ageYears: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              身長 (cm)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={50}
              max={260}
              placeholder="cm"
              value={p.heightCm ?? ""}
              onChange={(e) =>
                setP({
                  ...p,
                  heightCm: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              体重 (kg)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={30}
              max={300}
              placeholder="kg"
              value={p.bodyWeightKg ?? ""}
              onChange={(e) =>
                setP({
                  ...p,
                  bodyWeightKg:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500"
      >
        保存
      </button>

      {saved && (
        <p className="mt-3 text-center text-sm text-emerald-600 dark:text-emerald-400">
          保存しました
        </p>
      )}
    </section>
  );
}
