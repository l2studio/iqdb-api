import { Website, Service, SearchInput, SearchOptions, SearchResult } from './type'
import { Readable } from 'stream'
import got, { OptionsOfTextResponseBody } from 'got'
import FormData from 'form-data'
import cheerio from 'cheerio'
import crypto from 'crypto'

/* Export API */

export async function search (input: SearchInput, options?: SearchOptions): Promise<SearchResult[]> {
  const response = await requestSearch(input, options)
  return handleSearch(response, options)
}

export async function status () { return undefined }

/* Utils */

const WebsiteUrls: Record<Website, string> = {
  www: 'https://iqdb.org/',
  '3d': 'https://3d.iqdb.org/'
}

const Services = Object.values(Service)
const ServiceIdMappings: Record<Service, number> = {
  [Service.Danbooru]: 1,
  [Service.Konachan]: 2,
  [Service.Yandere]: 3,
  [Service.Gelbooru]: 4,
  [Service.SankakuChannel]: 5,
  [Service.E_Shuushuu]: 6,
  [Service.Zerochan]: 11,
  [Service.AnimePictures]: 13,
  [Service.ThreeDBooru]: 7,
  [Service.IdolComplex]: 9
}

const SourceNamedServiceMappings = Services.reduce((acc, service) => {
  const lowerCase = service.toLowerCase()
  acc[lowerCase] = service
  acc[lowerCase.replace(/\s/g, '-')] = service
  return acc
}, {} as Record<string, Service>)

/* Handles */

function requestSearch (input: SearchInput, options?: SearchOptions): Promise<string> {
  const url = WebsiteUrls[options?.website?.origin || 'www']
  if (!url) {
    // Avoid typing wrong origin value when using pure JS without type completion
    throw new Error('Invalid website origin: ' + options?.website?.origin)
  }

  // Construct form data
  const formData = new FormData()

  if (input instanceof Buffer || input instanceof Readable) {
    // Generate a random file name
    const length = Math.ceil(Math.random() * 10 + 5)
    const filename = options?.filename || crypto.randomBytes(length).toString('hex')
    formData.append('file', input, { filename })
  } else if (typeof input === 'string') {
    // If input is a string, assume it is a URL
    formData.append('url', input)
  } else {
    throw new Error('Expected input to be a string, buffer or a Readable stream')
  }

  if (options?.website?.services && Array.isArray(options?.website?.services)) {
    for (const service of options.website.services) {
      const id = ServiceIdMappings[service]
      id && formData.append('services[]', id)
    }
  }

  if (options?.ignoreColors) {
    formData.append('forcegray', true)
  }

  // Construct options and send request
  const requestOptions = got.mergeOptions(options?.requestOptions || {}, {
    url,
    method: 'POST',
    responseType: 'text',
    headers: formData.getHeaders(),
    body: formData
  }) as OptionsOfTextResponseBody

  return got(requestOptions).text()
}

function handleSearch (response: string, options?: SearchOptions): SearchResult[] {
  const $ = cheerio.load(response)
  const error = parseError($)
  if (error) {
    throw new Error(error)
  }

  const results = parseResults($, options?.pickMoreResults)
  // if (options?.giveMoreResults) {
  //   const giveMoreResultsHref = parseGiveMoreResultsHref($)
  //   TODO: implement
  // }
  return results
}

function parseError ($: cheerio.Root): string | undefined {
  const $errEl = $('body .err')
  if ($errEl?.length > 0) {
    return $errEl.text()
  }
}

function parseResults ($: cheerio.Root, pickMoreResults?: boolean): SearchResult[] {
  let results = $('body div#pages')
    .children()
    .map((_, $pageEl) => parseResultsPage($, $pageEl))
    .get() as SearchResult[]

  const $moreEl = pickMoreResults === true ? $('body div#more1') : undefined
  if ($moreEl && $moreEl.length > 0) {
    const moreResults = $($moreEl).find('div.pages')
      .children()
      .map((_, $pageEl) => parseResultsPage($, $pageEl))
      .get() as SearchResult[]
    if (moreResults.length > 0) {
      results = results.concat(moreResults)
    }
  }
  return results
}

function parseResultsPage ($: cheerio.Root, $pageEl: cheerio.Element): SearchResult | undefined {
  const $rows = $($pageEl).find('table tr')
  if ($rows.length <= 0) return undefined

  const $matchEl = $($rows[0]).find('th')
  const $thumbnailLinkEl = $($rows[$matchEl.length]).find('td a')
  const $thumbnailImageEl = $($thumbnailLinkEl).find('img')
  if ($thumbnailImageEl.length <= 0) return undefined

  const matchText = $matchEl.length > 0 ? $matchEl.text().toLowerCase() : 'other'
  const thumbnailLinkHref = $thumbnailLinkEl.attr('href') as string
  const thumbnailImageSrc = $thumbnailImageEl.attr('src') as string
  const thumbnailImageAlt = $thumbnailImageEl.attr('alt') as string

  const match = matchText.replace(/match/g, '').trim()
  const thumbnail: SearchResult['thumbnail'] = {
    src: thumbnailImageSrc,
    fixedSrc: fixedHref(thumbnailImageSrc),
    ...parseImageProperties(thumbnailImageAlt)
  }

  const $sourceEl = $($rows[$matchEl.length + 1]).find('td')
  const firstSource = $sourceEl.clone().children().remove().end().text().trim().toLowerCase()
  const otherSources = $sourceEl.find('span.el a').map((_, $el) => {
    const ref = $($el)
    const service = ref.text().trim().toLowerCase()
    const href = ref.attr('href') as string
    return {
      service: SourceNamedServiceMappings[service],
      href,
      fixedHref: fixedHref(href)
    }
  }).get() as SearchResult['sources']

  const sources: SearchResult['sources'] = [
    {
      service: SourceNamedServiceMappings[firstSource],
      href: thumbnailLinkHref,
      fixedHref: fixedHref(thumbnailLinkHref)
    }
  ].concat(otherSources)

  const $dimensionEl = $($rows[$matchEl.length + 2]).find('td')
  const dimensionTexts = $dimensionEl.text().trim().split(' ')
  const dimension = dimensionTexts[0].replace(/[^\d]/g, '-').split('-')
  const width = parseInt(dimension[0])
  const height = parseInt(dimension[1])
  const type = dimensionTexts[1].substring(1, dimensionTexts[1].length - 1).toLowerCase()

  const $similarityEl = $($rows[$matchEl.length + 3]).find('td')
  const similarityTexts = $similarityEl.text().trim().split(' ')
  const similarity = parseInt(similarityTexts[0].replace('%', ''))
  const similarityPercentage = similarity / 100

  return {
    match,
    thumbnail,
    sources,
    width,
    height,
    type,
    similarity,
    similarityPercentage
  } as SearchResult
}

function fixedHref (href: string): string {
  if (href[0] === '/' && href[1] === '/') {
    // If not the iqdb.org website, use HTTP protocol for validity
    return 'http:' + href
  } else if (href[0] === '/') {
    return 'https://iqdb.org' + href
  } return href
}

function parseImageProperties (alt: string) {
  const parts = alt.split(' ')
  const properties: Record<string, string | string[]> = {}
  let tmp = ''
  for (const part of parts) {
    if (part.charAt(part.length - 1) === ':') {
      tmp = part.substring(0, part.length - 1).toLowerCase()
      continue
    }
    const value = properties[tmp]
    value
      ? (!Array.isArray(value) ? (properties[tmp] = [value]) : value).push(part)
      : properties[tmp] = part
  }

  return {
    rating: properties.rating as string,
    score: properties.score ? parseInt(properties.score as string) : undefined,
    tags: fixedTags(properties.tags)
  }
}

function fixedTags (tags?: string | string[]): string[] | undefined {
  if (!tags) return undefined
  if (typeof tags === 'string') return [tags]

  const newTags: string[] = []
  for (const tag of tags) {
    const parts = tag.split(',')
    for (let part of parts) {
      part = part.trim()
      if (part.length > 0) {
        newTags.push(part)
      }
    }
  } return newTags
}

// function parseGiveMoreResultsHref ($: cheerio.Root): string {}
