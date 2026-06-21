# YM Music Player

ページ内の YouTube リンクと MP3 リンクを自動で拾い、固定表示のミュージックプレイヤーとして再生する軽量 JavaScript です。

`player.js` を読み込むだけで、対象リンクに再生用のクリック処理が付き、画面左下にプレイヤーが生成されます。

## Features

- YouTube 短縮 URL と通常 URL に対応
- `.mp3` ファイルの再生に対応
- ページ内の対象リンクからプレイリストを自動生成
- 曲名を `data-title` で指定可能
- フッター画像を `data-img` で指定可能
- MP3 だけのページでは YouTube iframe API を読み込まない
- 内部変数や関数は即時関数内に閉じ、グローバル汚染を抑制
- CSS カスタムプロパティで色を変更可能

## Setup

HTML から `player.js` を読み込みます。

```html
<script src="player.js"></script>
```

あとは、本文内に YouTube または MP3 へのリンクを置くだけです。

```html
<a href="https://youtu.be/cDugSYo7qP8">YouTube sample</a>
<a href="/music/sample.mp3">MP3 sample</a>
```

## Supported Links

### YouTube

以下の形式に対応しています。

```html
<a href="https://youtu.be/cDugSYo7qP8">YouTube short URL</a>
<a href="https://www.youtube.com/watch?v=cDugSYo7qP8">YouTube watch URL</a>
```

YouTube リンクがページ内にある場合だけ、YouTube iframe API を読み込みます。

### MP3

`.mp3` で終わるリンクに対応しています。クエリ文字列付きの URL も対象になります。

```html
<a href="/audio/song.mp3">Song</a>
<a href="/audio/song.mp3?v=1">Song with query</a>
```

## Link Options

### data-title

プレイヤー上やトラックリストに表示する曲名を指定できます。

```html
<a href="https://youtu.be/cDugSYo7qP8" data-title="曲名">
	https://youtu.be/cDugSYo7qP8
</a>
```

`data-title` がない場合は、リンクのテキストが曲名として使われます。

### data-img

プレイヤー下部に表示する画像を指定できます。

```html
<a
	href="/audio/song.mp3"
	data-title="Song title"
	data-img="/images/jacket.jpg"
>
	Song title
</a>
```

`data-img` がない場合は、フッターに `webs` リンクが表示されます。

## Example

```html
<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Music Player Demo</title>
	<script src="player.js"></script>
</head>
<body>
	<a href="https://youtu.be/cDugSYo7qP8" data-title="YouTube track">
		YouTube track
	</a>

	<a href="/audio/sample.mp3" data-title="MP3 track" data-img="/images/jacket.jpg">
		MP3 track
	</a>
</body>
</html>
```

## Styling

色は CSS カスタムプロパティで変更できます。`player.js` 内では `:root` に以下の変数を定義しています。

```css
:root {
	--yplayer-color-surface:#fff;
	--yplayer-color-text:#333;
	--yplayer-color-link:#999;
	--yplayer-color-player-bg:#000;
	--yplayer-color-error:#f00;
	--yplayer-color-control-bg:rgba(0,0,0,.1);
	--yplayer-shadow:rgba(0, 0, 0, 0.2) 0 0 1em 0;
	--yplayer-open-shadow:rgba(0, 0, 0, 0.2) 0 0 calc(10 / 16 * 1em);
}
```

ページ側の CSS で上書きする場合は、`player.js` 読み込み後に同じ変数を再定義してください。

```html
<script src="player.js"></script>
<style>
:root {
	--yplayer-color-surface:#222;
	--yplayer-color-text:#fff;
	--yplayer-color-link:#bbb;
	--yplayer-color-player-bg:#000;
	--yplayer-color-error:#ff6666;
}
</style>
```

## API

### window.yplayer.reload()

ページ内の対象リンクを再捜索し、プレイヤーのトラックリストを更新します。Ajaxなどで動的にコンテンツ（MP3やYouTubeのリンク）が追加された場合、このメソッドを呼び出すことで自動的にリストが同期され、プレイヤーの表示/非表示状態も再評価されます。

```javascript
// 動的なコンテンツ追加後に呼び出す例
if (window.yplayer) {
	window.yplayer.reload();
}
```

## Notes

- YouTube の再生には外部の YouTube iframe API が必要です。
- YouTube のプレイヤー UI は、ブラウザや YouTube 側の仕様によって表示が変わることがあります。
- `onYouTubeIframeAPIReady` は YouTube iframe API から呼ばれるため、例外的に `window` に公開しています。
