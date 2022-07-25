import { OptionsOfTextResponseBody } from 'got'
import { Readable } from 'stream'

export type Website = 'www' | '3d'

export enum Service {
  // iqdb.org
  Danbooru = 'Danbooru',
  Konachan = 'Konachan',
  Yandere = 'Yande.re',
  Gelbooru = 'Gelbooru',
  SankakuChannel = 'Sankaku Channel',
  EShuushuu = 'e-shuushuu',
  Zerochan = 'Zerochan',
  AnimePictures = 'Anime-Pictures',
  // 3d.iqdb.org
  ThreeDBooru = '3dbooru',
  IdolComplex = 'Idol Complex',
}

type RootWebsiteService =
  | Service.Danbooru
  | Service.Konachan
  | Service.Yandere
  | Service.Gelbooru
  | Service.SankakuChannel
  | Service.EShuushuu
  | Service.Zerochan
  | Service.AnimePictures

type ThreeDWebsiteService =
  | Service.ThreeDBooru
  | Service.IdolComplex

export type SearchInput = string | Buffer | Readable

export interface SearchOptions {
  website?: ({
    origin: Website,
    services?: RootWebsiteService[]
  } | {
    origin: Website,
    services?: ThreeDWebsiteService[]
  })
  filename?: string
  ignoreColors?: boolean
  pickOtherResults?: boolean
  requestOptions?: OptionsOfTextResponseBody
}

export interface SearchResult {
  match: 'best' | 'additional' | 'possible' | 'other'
  thumbnail: {
    src: string
    fixedSrc: string
    rating?: string
    score?: number
    tags?: string[]
  }
  sources: Array<{
    service: Service
    href: string
    fixedHref: string
  }>
  width: number
  height: number
  type: 'safe' | 'ero' | 'explicit' | 'unrated'
  similarity: number
  similarityPercentage: number
}

export interface SearchResponse {
  searched: number
  timeSeconds: number
  timeMilliseconds: number
  thumbnailSrc: string
  otherSearchHrefs: {
    saucenao: string
    ascii2d: string
    google: string
    tineye: string
  }
  results: SearchResult[]
}
