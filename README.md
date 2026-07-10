# foodfight

2台のtoio™ Core Cubeを操作して、より多くの「食べ物」アイコンにタッチするかを競う2人対戦ゲーム。プロジェクターに投影した画面上で、プレイヤーはtoioキューブを手で動かして食べ物を取り合う。

## ディレクトリ構成

```
web/            現行版。ブラウザ(p5.js + Web Bluetooth API)でtoio 2台と直接通信する実装。
processing/     旧版。Processing(Java)で書かれたゲーム本体。
chrome拡張/      旧版で使用していたChrome拡張(toio_scratchの画面をDOMスクレイピングしてWebSocket送信)。
toio_scratch/   旧版で使用していたtoio公式Scratch環境へのリンク・プロジェクトファイル。
```

**現在アクティブに開発しているのは`web/`のみ。** `processing/`, `chrome拡張/`, `toio_scratch/`は過去バージョンの参照用として残してあり、`web/`はそれらに依存しない独立した実装。

## セットアップ・起動方法

`web/README.md`を参照。

## 経緯

もともとは「toio_scratch(公式Scratch環境)でtoio 2台とBluetooth接続 → Chrome拡張がtoio_scratchの画面をDOMスクレイピングしてWebSocket送信 → Processingアプリがゲーム本体としてWebSocketを受信」という3層構成だった。この構成のうち、Processing以外(Scratch・ブラウザ・Chrome拡張)は「toioの座標をリアルタイムに取得するためだけの手段」であり、100ms間隔のDOMスクレイピングという壊れやすい仕組みに依存していた。

ProcessingからBLEを直接叩く案も検討したが、JVM(Processing)にはmacOSで実用的なBLEライブラリがほぼ存在しないため断念。代わりに、ゲーム本体をJavaScript化してブラウザのWeb Bluetooth APIでtoio 2台と直接通信する構成に全面移植した(`web/`)。p5.jsはProcessingとほぼ1:1のAPIを持つため、既存ゲームロジック(当たり判定・パーティクル演出・射影変換キャリブレーション・サウンド)はほぼ機械的に移植できた。

## 開発メモ(実機テストで見つかった主な問題と対処)

- **toioのBLE Position ID座標系**: 生の座標はマット中心が(0,0)ではない(公式「toio™開発用プレイマット TMD01SS」の`#01-#06簡易プレイマット`面は`x:98〜402, y:142〜358`)。旧Processing版が使っていた`±147/±107`という値は、実は別の「toio Do」座標系(センタリング済み)に近い値で、生のPosition ID座標とは異なる。射影変換(4隅キャリブレーション)がこのズレを吸収するので、`MAT_SOURCE_CORNERS`をマットの実座標に合わせれば実測は不要([TMD01SS仕様書](https://doc.switch-science.com/media/files/a884cf63-a6f3-4ad9-b8f1-71084124a3a3.pdf)より)。
- **射影変換の中心点**: プロジェクターにキーストーン(台形)歪みがあると、「マット座標の中点をワープした点」と「実際に投影された4隅の視覚的重心」は一致しない(アフィン変換なら一致するが、一般の射影変換ではズレる)。スコア表示等の中央揃えは、ワープ済みの4隅の座標を平均した重心を使うことで解決した。
- **p5.jsの`fill(colorObject, alpha)`**: Processingと違い、p5.jsではColorオブジェクト+透明度の2引数指定だと透明度が無視される。パーティクルの明滅演出を正しく効かせるには`fill(red(c), green(c), blue(c), alpha)`のようにRGB成分を個別に渡す必要がある。
- **toioのBLE特性ごとの書き込み方式**: Position ID/Light(LED)特性は通常の`writeValue()`(Write)で動作するが、Motor(モーター制御)特性は「Write Without Response」専用。`writeValueWithoutResponse()`を明示的に使わないと、エラーも出ないまま黙って効かない。
- **Joy-Con(横持ち)のスティック軸**: 横持ちで使う場合、L/Rそれぞれ持ち方が鏡写しになるため、スティックのX/Y軸を90度回転させる補正が必要(回転方向はL/Rで逆)。

## toio公式BLE仕様の参考リンク

- https://toio.github.io/toio-spec/
