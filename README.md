# MEMORY TICKET

**画像からつくる、自分だけのチケット。**

MEMORY TICKET は、写真やイラストを一枚の「記念チケット」に仕立てる Web アプリです。

旅先の写真、日常の一枚、イベントの思い出などに、タイトル・日付・シリアル番号・QR コードを添えて、手元に残せる一枚として書き出せます。

ブラウザだけで利用でき、画像の加工やチケットの生成もブラウザ内で完結します。

> **MEMORY TICKET を使う**  
> GitHub Pages URL をここに記載

<!--
Screenshot / demo GIF

![MEMORY TICKET](./docs/preview.png)
-->

## Features

- **画像からチケットを作成**
  - JPEG / PNG / WebP / AVIF に対応
  - ドラッグ & ドロップ対応
  - 位置・拡大率を調整できるトリミング

- **写真に合わせたカラー**
  - 画像からカラーパレットを自動抽出
  - 手動でパステルカラーを選択することも可能

- **3つのデザインスタイル**
  - `Pastel`
  - `Museum`
  - `Retro`

- **表面 / 裏面を個別に編集**
  - 表面は写真とチケット情報を中心に構成
  - 裏面には任意の見出し・文章・画像を配置可能

- **券面を細かくカスタマイズ**
  - タイトル
  - サブタイトル
  - 日付
  - シリアル番号
  - メタデータ
  - 半券の位置
  - 券面上の各種ラベル

- **QR / バーコード**
  - QR Code
  - Code 128 Barcode
  - QR とバーコードの同時配置
  - コードなしのデザインにも対応

- **高解像度書き出し**

  | 設定 | 出力サイズ |
  | --- | --- |
  | 標準 | 1800 × 900 |
  | 高画質 | 3600 × 1800 |
  | 最高画質 | 5400 × 2700 |

- **PNG / PSD 出力**
  - 完成したチケットを PNG として保存
  - 背景、写真、文字、コードなどを分けた PSD を生成
  - PSD は CLIP STUDIO PAINT などで追加編集可能

- **共有**
  - Web Share API 対応環境では画像を共有先へ直接渡せます
  - 非対応環境では PNG 保存後、X の投稿画面を開けます

## How to use

### 1. 画像を選ぶ

画像をドロップするか、「画像を選ぶ」からファイルを開きます。

画像を読み込むと、写真からカラーパレットが自動的に抽出されます。

### 2. チケットを編集する

タイトル、日付、シリアル番号などを入力します。

必要に応じて、カラー、デザインスタイル、半券の位置、QR / バーコード、券面上の細かな文字も変更できます。

編集内容はプレビューへリアルタイムに反映されます。

### 3. 表面 / 裏面を作る

「表」「裏」を切り替えて、それぞれ個別に編集できます。

裏面には見出しや文章を入れられるため、写真だけでは残しきれない、その一枚についての記録も添えられます。

### 4. 保存する

書き出しサイズを選択し、`PNG保存` または `PSDを保存` から保存します。

表面と裏面は、それぞれ個別のファイルとして書き出されます。

## Privacy

MEMORY TICKET の画像処理とチケット生成は、ブラウザ上で行われます。

選択した画像を画像処理のために外部サーバーへアップロードする処理はありません。画像はブラウザ内で読み込まれ、Canvas 上で処理・レンダリングされます。

## Supported images

以下の画像形式に対応しています。

- JPEG
- PNG
- WebP
- AVIF

1ファイルあたり最大 **30 MB** です。

また、極端に大きな画像によるブラウザ負荷を避けるため、画像の総画素数にも上限を設けています。

## Export

### PNG

完成したチケットを PNG 形式で保存できます。

以下の3種類の解像度から選択できます。

- 1800 × 900
- 3600 × 1800
- 5400 × 2700

### PSD

チケットを PSD として保存することもできます。

背景・写真・文字・QR コードなどは、それぞれ画像レイヤーとして分離されます。

CLIP STUDIO PAINT で使用する場合は、PSD を開いたあと `.clip` 形式で保存してください。

`.clip` 形式の直接出力には対応していません。

## Technology

MEMORY TICKET は、ブラウザ標準 API と軽量な JavaScript ライブラリを中心に構成されています。

- JavaScript / ES Modules
- Vite
- Canvas 2D
- QRCode
- JsBarcode
- ag-psd
- Fontsource
  - Manrope
  - Noto Sans JP
  - IBM Plex Mono

チケットは Canvas 上でレンダリングされ、同じ描画結果を PNG / PSD の生成にも利用しています。

## WebMCP

対応するブラウザ環境では、`document.modelContext` を利用して WebMCP ツールを登録します。

現在は `configure_ticket_text` を利用して、外部エージェントから次の内容を変更できます。

- `title`
- `subtitle`

WebMCP に対応していないブラウザでも、MEMORY TICKET 本体の機能には影響ありません。

## GitHub Pages

MEMORY TICKET は GitHub Pages 上で公開することを想定しています。

GitHub Actions の workflow により、テストとビルドを行った上で GitHub Pages へデプロイできます。

```text
GitHub Actions
    ↓
Test
    ↓
Build
    ↓
GitHub Pages
```

## Rights and generated images

MEMORY TICKET のソースコードは MIT License のもとで公開されています。

MEMORY TICKET を使用して生成したチケット画像は、個人利用・公開・改変・商用利用を含め、自由に利用できます。MEMORY TICKET の作者が、生成された画像そのものについて権利を主張することはありません。

ただし、生成画像に含まれる写真、イラスト、文章、商標、人物の肖像その他の素材については、それぞれの権利が引き続き適用されます。

アップロードまたは入力する素材について必要な権利を有していることは、利用者自身で確認してください。MEMORY TICKET の利用によって、第三者が保有する著作権、商標権、肖像権その他の権利が新たに許諾されるものではありません。

## License

MEMORY TICKET のソースコードは [MIT License](./LICENSE) のもとで公開されています。

MIT License の条件に従い、利用・改変・再配布・商用利用が可能です。

なお、リポジトリに含まれる第三者のソフトウェア、フォント、画像には、それぞれ個別のライセンスが適用されます。

- Manrope — SIL Open Font License 1.1
- Noto Sans JP — SIL Open Font License 1.1
- IBM Plex Mono — SIL Open Font License 1.1
- Sample photograph “Reflections on Lake McDonald” — CC0 1.0
- qrcode / JsBarcode / ag-psd — MIT License

詳細は [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) および `public/licenses/` を参照してください。

## Third-party software

使用しているサードパーティソフトウェア、フォント、デモ画像の権利表記については [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) を参照してください。
