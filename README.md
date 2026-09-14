# はるメモ

ブラウザだけで動くメモ帳。ログインなし、サーバなし、GitHub Pages に置けば完成。

データは開いたブラウザの `localStorage` に保存される。端末やブラウザが変わると見えないので、大事なメモは「書き出し」すること。

## できること

- 複数メモの作成・編集・削除
- 入力したら自動保存
- 検索 / ピン留め / 並び替え
- JSON で書き出し・読み込み
- ダーク / ライト
- スマホでも使える（一覧 ↔ 編集）
- オフライン（Service Worker）
- `Ctrl/Cmd + N` 新規、`Ctrl/Cmd + S` 保存

## GitHub Pages への上げ方

1. GitHub で新しいリポジトリを作る（例: `haru-memo`）
2. このフォルダのファイルを全部リポジトリのルートに置く
   - `index.html`
   - `styles.css`
   - `app.js`
   - `manifest.json`
   - `sw.js`
   - `README.md`
3. リポジトリの **Settings → Pages**
4. Source を **Deploy from a branch**
5. Branch を `main`、フォルダを `/ (root)` にして Save
6. 少し待つと  
   `https://<ユーザー名>.github.io/haru-memo/`  
   で開ける

GitHub Desktop でも、Web の Upload files でもいい。

## ローカル確認

このフォルダで簡易サーバを立てる。

```bash
# Python がある場合
python3 -m http.server 8080
```

ブラウザで `http://localhost:8080` を開く。
