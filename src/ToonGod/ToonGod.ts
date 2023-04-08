import {
    ContentRating,
    SourceInfo,
    BadgeColor,
    SourceIntents,
    PagedResults,
    PartialSourceManga,
    HomeSection
} from '@paperback/types'

import {
    getExportVersion,
    Madara
} from '../Madara'

const DOMAIN = 'https://www.toongod.org'

export const ToonGodInfo: SourceInfo = {
    version: getExportVersion('0.0.0'),
    name: 'ToonGod',
    description: `Extension that pulls manga from ${DOMAIN}`,
    author: 'Netsky',
    authorWebsite: 'http://github.com/TheNetsky',
    icon: 'icon.png',
    contentRating: ContentRating.ADULT,
    websiteBaseURL: DOMAIN,
    sourceTags: [
        {
            text: 'Notifications',
            type: BadgeColor.GREEN
        },
        {
            text: '18+',
            type: BadgeColor.YELLOW
        },
        {
            text: 'Cloudflare',
            type: BadgeColor.RED
        }
    ],
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED | SourceIntents.SETTINGS_UI
}

export class ToonGod extends Madara {

    baseUrl: string = DOMAIN

    override alternativeChapterAjaxEndpoint = true

    override hasAdvancedSearchPage = true


    override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const sections = [
            {
                request: App.createRequest({
                    url: `${this.baseUrl}/webtoons?m_orderby=latest`,
                    method: 'GET'
                }),
                section: App.createHomeSection({
                    id: '0',
                    title: 'Recently Updated',
                    type: 'singleRowNormal',
                    containsMoreItems: true
                }),
            },
            {
                request: App.createRequest({
                    url: `${this.baseUrl}/webtoons?m_orderby=trending`,
                    method: 'GET'
                }),
                section: App.createHomeSection({
                    id: '1',
                    title: 'Currently Trending',
                    type: 'singleRowNormal',
                    containsMoreItems: true
                })
            },
            {
                request: App.createRequest({
                    url: `${this.baseUrl}/webtoons?m_orderby=views`,
                    method: 'GET'
                }),
                section: App.createHomeSection({
                    id: '2',
                    title: 'Most Popular',
                    type: 'singleRowNormal',
                    containsMoreItems: true
                })
            },
            {
                request: App.createRequest({
                    url: `${this.baseUrl}/webtoons?m_orderby=new-manga`,
                    method: 'GET'
                }),
                section: App.createHomeSection({
                    id: '3',
                    title: 'New Manga',
                    type: 'singleRowNormal',
                    containsMoreItems: true
                })
            }
        ]

        const promises: Promise<void>[] = []
        for (const section of sections) {
            // Let the app load empty sections
            sectionCallback(section.section)

            // Get the section data
            promises.push(
                this.requestManager.schedule(section.request, 1).then(async response => {
                    this.CloudFlareError(response.status)
                    const $ = this.cheerio.load(response.data as string)
                    section.section.items = await this.parser.parseHomeSection($, this)
                    sectionCallback(section.section)
                }),
            )

        }

        // Make sure the function completes
        await Promise.all(promises)
    }


    override async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page = metadata?.page ?? 1
        let param: string

        switch (homepageSectionId) {
            case '0': {
                param = 'm_orderby=latest'
                break
            }
            case '1': {
                param = 'm_orderby=trending'
                break
            }
            case '2': {
                param = 'm_orderby=views'
                break
            }
            case '3': {
                param = 'm_orderby=new-manga'
                break
            }
            default:
                throw new Error(`Invalid homeSectionId | ${homepageSectionId}`)
        }

        const request = App.createRequest({
            url: `${this.baseUrl}/webtoons/page/${page}/?${param}`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
        const $ = this.cheerio.load(response.data as string)
        const items: PartialSourceManga[] = await this.parser.parseHomeSection($, this)

        let mData: any = { page: (page + 1) }
        if (!$('a.last')) {
            mData = undefined
        }

        return App.createPagedResults({
            results: items,
            metadata: mData
        })
    }

}