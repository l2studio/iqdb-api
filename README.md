# L2 Studio - IQDB API

<p>
<a href="https://github.com/l2studio/iqdb-api/actions"><img src="https://img.shields.io/github/actions/workflow/status/l2studio/iqdb-api/ci.yml?branch=main&logo=github&style=flat-square"/></a>
<a href="https://www.npmjs.com/package/@l2studio/iqdb-api"><img src="https://img.shields.io/npm/v/@l2studio/iqdb-api?logo=npm&style=flat-square"/></a>
</p>

A library for iqdb.org image search api

## Install

```shell
npm install --save @l2studio/iqdb-api
# or
pnpm i @l2studio/iqdb-api
```

## API

```ts
import * as iqdb from '@l2studio/iqdb-api'
# or
import { search } from '@l2studio/iqdb-api'
```

### .search

```ts
iqdb.search(input: SearchInput, options?: SearchOptions): Promise<SearchResponse>
```

### SearchInput

> A type alias, equivalent to `String | Buffer | Readable`. Can be a stringify image url, image buffer or readable stream.

```ts
export type SearchInput = string | Buffer | Readable
```

E.g.:
  * String - `'http://example.com/yourimage.jpg'`
  * Buffer - `fs.readFileSync('/path/yourimage.jpg')`
  * Readable - `fs.createReadStream('/path/yourimage.jpg')`

### SearchOptions

> Website `origin` and `services` see also: [/src/type.ts](https://github.com/l2studio/iqdb-api/blob/02f294c/src/type.ts#L4-L33)

```ts
export interface SearchOptions {
  /*
   * Websites and Image Services Used.
   * If services is not defined, all services of the current origin are used.
   */
  website?: ({
    origin: Website,
    services?: RootWebsiteService[]
  } | {
    origin: Website,
    services?: ThreeDWebsiteService[]
  })
  /**
   * Custom filename when the input is a image buffer or readable stream.
   * Use random string when is not defined.
   */
  filename?: string
  // Whether to ignore the color of the input image. (Force Gray)
  ignoreColors?: boolean
  // Whether to pick up more other results.
  pickOtherResults?: boolean
  // Got request options (See: https://github.com/sindresorhus/got/blob/main/documentation/2-options.md)
  requestOptions?: OptionsOfTextResponseBody
}
```

### SearchResult

```ts
export interface SearchResult {
  // Result match
  match: 'best' | 'additional' | 'possible' | 'other'
  // Thumbnail
  thumbnail: {
    // Raw src: /danbooru/foo/bar.jpg
    src: string
    // Fixed src: https://iqdb.org/danbooru/foo/bar.jpg
    fixedSrc: string
    // Image rating: q, s, e...
    rating?: string
    // Image score
    score?: number
    // Image tags
    tags?: string[]
  }
  // All source services
  sources: Array<{
    // Service: Danbooru, Gelbooru, etc...
    service: Service
    // Raw href: //danbooru.donmai.us/posts/foo
    href: string
    // Fixed href: http://danbooru.donmai.us/posts/foo
    // Fixed always use http!
    fixedHref: string
  }>
  // Result width
  width: number
  // Result height
  height: number
  // Result type
  type: 'safe' | 'ero' | 'explicit' | 'unrated'
  // Result similarity (0 - 100)
  similarity: number
  // Similarity percentage (0.00 - 1.00)
  similarityPercentage: number
}
```

### SearchResponse

```ts
export interface SearchResponse {
  // Searched images
  searched: number
  // Timecost (Seconds) e.g.: 14.054
  timeSeconds: number
  // Timecost (Milliseconds) e.g.: 14054
  timeMilliseconds: number
  // IQDB Thumbnail src. e.g.: https://iqdb.org/thu/thu_24432b8d.jpg
  thumbnailSrc: string
  // Other search sites for thumbnail src.
  otherSearchHrefs: {
    saucenao: string
    ascii2d: string
    google: string
    tineye: string
  }
  // Search results
  results: SearchResult[]
}
```

## License

Apache-2.0
