# L2 Studio - IQDB API

<p>
<a href="https://github.com/l2studio/iqdb-api/actions"><img src="https://img.shields.io/github/workflow/status/l2studio/iqdb-api/CI?logo=github&style=flat-square"/></a>
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

By default, there is only one default function.

```typescript
import iqdb from '@l2studio/iqdb-api'

iqdb(picture: string | Buffer | Readable, opts?: Options): Promise<Response>
```

Options:

```typescript
type Options = {
  filename?: string       // File name when picture is Buffer or Readable type (optional)
  website?: WebsiteOption // Website and services (optional)
  ignoreColors?: boolean  // Whether ignore picture color (optional)
  similarity?: number     // Whether to filter results greater than or equal this similarity (optional: 0 - 100)
  timeout?: number        // http request timeout (optional)
  proxy?: {               // http proxy (optional)
    host: string          //      proxy host (required)
    port: number          //      porxy port (required)
  }
}

// Website options use corresponding services due to id. Services is optional.
type WebsiteOption = ({
  id: 'www'
  services?: ('danbooru' | 'konachan' | 'yandere' | 'gelbooru' | 'sankaku' | 'e-shuushuu' | 'zerochan' | 'anime-pictures')[]
} | {
  id: '3d'
  services?: ('3dbooru' | 'idol')[]
})
```

Response:

```typescript
type Response = {
  success: boolean   // Whether succeed
  error?: string     // Error message (Only when success is false)
  results?: Result[] // Search results (Only when success is true)
}

type Result = {
  head: 'best match' | 'additional match' | 'possible match' | string // Result title head
  url: string                                // Service source url
  image: string                              // IQDB picture preview url
  sources: string[]                          // Service sources
  width: number                              // Picture width
  height: number                             // Picture height
  type: 'safe' | 'ero' | 'explicit' | string // Picture type (safe: not R18, ero: R18)
  similarity: number                         // Picture similarity (0 - 100)
  properties: {                              // Picture properties
    rating?: string                          // Rating
    score?: number                           // Score
    tags?: string[]                          // Tags
  } & Record<string, any>                    // Others
}
```

Example 1: Default website options is `www` and all services.

```typescript
iqdb('http://your-picture-url.jpg')
```

Example 2: Search using specified services.

```typescript
iqdb('http://your-picture-url.jpg', {
  website: {
    id: 'www',
    services: ['danbooru', 'yandere'] // Use Danbooru and yande.re services
  }
})
```

## License

Apache-2.0
