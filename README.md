# muscrecord（筋トレ記録 PWA）

Next.js の PWA です。**ログインやユーザー認証はなく**、トレーニング記録は**各端末のブラウザ内**にだけ保存されます。

## 開発

```bash
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

`.env.local` に `NEXT_PUBLIC_GEMINI_API_KEY` を設定すると「メニュー提案」が使えます（[.env.example](./.env.example) 参照）。

## データの保存場所（重要）

| 種類 | 保存先 | 内容の例 |
|------|--------|----------|
| **記録** | **IndexedDB**（Dexie / DB 名 `muscle-pwa-db`） | ワークアウト、セット、LLM 提案 ToDo など |
| **設定・キー値** | **localStorage**（キー `muscrecord:setting:*`） | メニュー提案用プロフィール等 |
| **画面の一時状態** | **localStorage** | 提案画面のコンディション入力ドラフトなど |

- **データは端末・ブラウザごと**です。別の PC やスマホでは共有されません。
- **プライベートモード**やストレージ削除で消えることがあります。
- **設定 → データのバックアップ**から JSON のエクスポート／インポートができます。

## メニュー提案（LLM）

「メニュー提案」は**ブラウザから Google Gemini** へ直接リクエストします。`NEXT_PUBLIC_GEMINI_API_KEY` が必要です。`NEXT_PUBLIC_` 付きのため、**ビルド成果物にキー文字列が含まれる**扱いです。公開リポジトリにコミットしないでください（GitHub では **Repository secrets** から CI のみに渡す想定）。

## 本番ビルド

```bash
npm run build
npm start
```

## GitHub Pages で公開

1. この `muscrecord` フォルダを（推奨）**リポジトリのルート**として GitHub に push する。  
2. リポジトリ **Settings → Secrets and variables → Actions** に、シークレット名 **`GEMINI_API_KEY`** で Google AI の API キーを登録（メニュー提案用。未設定だと提案画面はエラーになるが、記録機能は使える）。  
3. リポジトリ **Settings → Pages** で **Build and deployment** の **Source** を **GitHub Actions** にする。  
4. `main`（または `master`）に push すると [`.github/workflows/github-pages.yml`](./.github/workflows/github-pages.yml) が走り、静的ファイルが `gh-pages` 相当の形でデプロイされる。  
5. 公開 URL の形: **`https://<あなたのユーザー名>.github.io/<リポジトリ名>/`**  
   初回は数分待つ。Actions の **Deploy** ジョブが成功したら、同画面の **View deployment** から URL を確認できる。

`BASE_PATH` はリポジトリ名に合わせて CI 内で自動設定しています。  
**モノレポ**で `muscrecord` がサブフォルダだけの場合は、ワークフローに `working-directory: muscrecord` を足し、`upload-pages-artifact` の `path` を `muscrecord/out` に合わせてください。

### 静的エクスポート用のローカルビルド

```bash
# Windows PowerShell 例
$env:GITHUB_PAGES="true"
$env:BASE_PATH="/リポジトリ名"
npm run build
# 成果物は out/ フォルダ
```

## ライセンス

プロジェクトに合わせて追記してください。
