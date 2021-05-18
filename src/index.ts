import { Readable } from 'stream'
import FormData from 'form-data'
import crypto from 'crypto'
import tunnel from 'tunnel'
import cheerio from 'cheerio'
import got from 'got'

const debug = require('debug')('lgou2w:iqdb-api')
const isDebug = typeof process.env.DEBUG !== 'undefined'

const Websites = {
  www: 'https://iqdb.org',
  '3d': 'https://3d.iqdb.org'
}

const ServiceIds = {
  danbooru: 1,
  konachan: 2,
  yandere: 3,
  gelbooru: 4,
  sankaku: 5,
  'e-shuushuu': 6,
  zerochan: 11,
  'anime-pictures': 13,
  '3dbooru': 7,
  idol: 9
}

type Picture = string | Buffer | Readable

type WebsiteOption = ({
  id: 'www'
  services?: ('danbooru' | 'konachan' | 'yandere' | 'gelbooru' | 'sankaku' | 'e-shuushuu' | 'zerochan' | 'anime-pictures')[]
} | {
  id: '3d'
  services?: ('3dbooru' | 'idol')[]
})

export type Options = {
  filename?: string
  website?: WebsiteOption
  ignoreColors?: boolean
  similarity?: number
  timeout?: number
  proxy?: {
    host: string
    port: number
  }
}

type Result = {
  head: 'best match' | 'additional match' | 'possible match' | string
  url: string
  image: string
  sources: string[]
  width: number
  height: number
  type: 'safe' | 'ero' | 'explicit' | string
  similarity: number
  properties: {
    rating?: string
    score?: number
    tags?: string[]
  } & Record<string, any>
}

export type Response = {
  success: boolean
  error?: string
  results?: Result[]
}

export default async function iqdb (picture: Picture, opts?: Options): Promise<Response> {
  opts = opts || {}
  const response = makeRequest(picture, opts)
  return await parseResult(response, opts)
}

function makeRequest (picture: Picture, opts: Options): Promise<string> {
  const url = Websites[opts.website ? opts.website.id : 'www']
  if (!url) throw new Error('无效的站点 ID：' + opts.website?.id)

  const form = new FormData()
  if (typeof picture === 'string') form.append('url', picture)
  else if (picture instanceof Buffer || picture instanceof Readable) {
    const rng = Math.ceil(Math.random() * 10 + 5)
    const filename = opts.filename || crypto.randomBytes(rng).toString('hex') + '.jpg'
    form.append('file', picture, { filename })
  } else throw new Error('图片的预期类型为：string | Buffer | Readable')

  opts.website && opts.website.services && appendServices(form, opts.website.services)
  opts.ignoreColors && form.append('forcegray', true)

  return got.post(url, {
    body: form,
    headers: form.getHeaders(),
    timeout: opts.timeout,
    agent: opts.proxy
      ? {
          http: tunnel.httpOverHttp({ proxy: opts.proxy }),
          https: tunnel.httpsOverHttp({ proxy: opts.proxy }) as any
        }
      : undefined
  }).text()
}

function appendServices (form: FormData, services: WebsiteOption['services']) {
  if (!Array.isArray(services)) throw new Error('站点服务的预期类型为：string[]')
  for (const service of services) {
    const id = ServiceIds[service]
    id && form.append('service[]', id)
  }
}

function pickImageProperties (alt: string): Result['properties'] {
  const properties: Result['properties'] = {}
  const items = alt.split(' ')
  let key = ''
  for (const item of items) {
    if (item.charAt(item.length - 1) === ':') {
      key = item.substring(0, item.length - 1).toLowerCase()
      continue
    }
    const value = properties[key]
    value
      ? (!Array.isArray(value) ? (properties[key] = [value]) : value).push(item)
      : properties[key] = item
  }
  return properties
}

async function parseResult (response: Promise<string>, opts: Options): Promise<Response> {
  const data = await response
  const $ = cheerio.load(data)

  const error = $('.err')
  if (error && error.length > 0) {
    return {
      success: false,
      error: error.text()
    }
  }

  const url = Websites[opts.website ? opts.website.id : 'www']
  let results = $('div#pages').children('div').map((_, page) => {
    const rows = $('tr', page)
    const head = $(rows[0]).text().trim().toLowerCase()
    if (head === 'your image') return undefined
    if (head === 'no relevant matches') return undefined

    const link = $('a', rows[1])
    const image = $('img', link)
    const fixedImageUrl = image.attr('src')!.charAt(0) === '/' ? url + image.attr('src')! : image.attr('src')!
    const sources = $(rows[2]).text().split(' ')
    const dimensionAndType = $(rows[3]).text().split(' ')
    const dimension = dimensionAndType[0].split('×')
    const similarity = $(rows[4]).text().replace('similarity', '').replace('%', '').trim()
    const properties = pickImageProperties(image.attr('alt')!)
    return <Result> {
      head,
      url: $(link).attr('href'),
      image: fixedImageUrl,
      sources,
      width: parseInt(dimension[0]),
      height: parseInt(dimension[1]),
      type: dimensionAndType[1].substring(1, dimensionAndType[1].length - 1).toLowerCase(),
      similarity: parseInt(similarity),
      properties
    }
  }).get() as Result[]

  opts.similarity && (results = results.filter(v => v.similarity >= opts.similarity!))
  return {
    success: true,
    results
  }
}
