import { useEffect, useState } from 'react'

export interface Post {
  banner: string
  bannerAlt: string
  date: string
  slug: string
  summary: string
  title: string
}

const parseXML = (xml: string) => {
  return new window.DOMParser().parseFromString(xml, 'text/xml')
}

export const useBlogPosts = (count: number) => {
  const [blogPosts, setBlogPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const fetchRecentBlogPosts = async () => {
    try {
      const res = await fetch(`https://blog.vlt.sh/feed.xml`).then(
        r => r.text(),
      )
      console.log(res)
      const posts = [...parseXML(res).querySelectorAll('item')]
        .map(item => {
          try {
            const description = parseXML(
              `<ROOT>${item.querySelector('description')?.childNodes[0]?.textContent}</ROOT>`,
            ).querySelector('ROOT')
            return {
              title:
                item.querySelector('title')?.innerHTML ?? 'title',
              slug: item.querySelector('link')?.innerHTML ?? 'slug',
              date:
                item.querySelector('pubDate')?.innerHTML ?? 'date',
              summary: description?.textContent ?? 'summary',
              banner:
                description
                  ?.querySelector('img')
                  ?.getAttribute('src') ?? 'src',
              bannerAlt:
                description
                  ?.querySelector('img')
                  ?.getAttribute('alt') ?? 'alt',
            }
          } catch (e) {
            console.error(`Error parsing blog post: ${e}`)
            return null
          }
        })
        .filter(v => v !== null)
        .slice(0, count)
      setBlogPosts(posts)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchRecentBlogPosts()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { blogPosts, loading }
}
