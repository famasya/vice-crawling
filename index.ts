import axios from "axios";
import { createObjectCsvWriter } from "csv-writer";

const csvWriter = createObjectCsvWriter({
  path: "output.csv",
  header: [
    { id: "id", title: "ID" },
    { id: "type", title: "Type" },
    { id: "title", title: "Title" },
    { id: "publish_date", title: "Publish Date" },
    { id: "url", title: "URL" },
    { id: "content_html", title: "Content (HTML)" },
    { id: "content_md", title: "Content (MD)" },
    { id: "topic", title: "Topic" },
    { id: "summary", title: "Summary" },
    { id: "contributors", title: "Contributors" },
  ],
  append: true,
  alwaysQuote: true,
});

const query = `
query LatestFeed(
    $locale: String = "en_us"
    $nsfw: Boolean
    $page: Float = 1
    $perPage: Float = 12
    $site: String = "vice"
    $topicID: ID
    $sectionID: ID
    $notID: String
    $type: String
    $sectionOrTopic: [ID]
) {
    latest(
        locale: $locale
        nsfw: $nsfw
        page: $page
        per_page: $perPage
        site: $site
        topic_id: $topicID
        section_id: $sectionID
        not_id: $notID
        type: $type
        section_or_topic: $sectionOrTopic
    ) {
        id
        type
        data {
            __typename
            ... on Article {
                ...ArticleFragment
                __typename
            }
            ... on Video {
                ...VideoFragment
                __typename
            }
            ... on Linkout {
                ...LinkoutFragment
                __typename
            }
        }
        pagination_info {
            count
            page
            per_page
            __typename
        }
        __typename
    }
}
fragment ArticleFragment on Article {
    __typename
    contributions {
        ...ContributionFragmentWEB
        __typename
    }
    channel {
        id
        name
        url
        __typename
    }
    dek
    id
    body_components_json
    locale
    publish_date
    section {
        ...SectionFragment
        __typename
    }
    primary_topic {
        id
        slug
        name
        __typename
    }
    slug
    thumbnail_url_16_9
    thumbnail_url_2_3
    thumbnail_url_1_1
    title
    social_title
    url
    web_id
}
fragment VideoFragment on Video {
    __typename
    contributions {
        ...ContributionFragmentWEB
        __typename
    }
    dek
    episode {
        season {
            show {
                ...ShowFragment
                __typename
            }
            __typename
        }
        __typename
    }
    id
    locale
    publish_date
    section {
        ...SectionFragment
        __typename
    }
    thumbnail_url_16_9
    thumbnail_url_1_1
    title
    social_title
    url
    duration
}
fragment LinkoutFragment on Linkout {
    __typename
    dek
    id
    thumbnail_url_16_9
    thumbnail_url_1_1
    site {
        name
        url
        __typename
    }
    title
    type
    url
    data {
        __typename
        ... on Article {
            ...ArticleFragment
            __typename
        }
        ... on Video {
            ...VideoFragment
            __typename
        }
    }
}
fragment ContributionFragmentWEB on Contribution {
    role_id
    role
    contributor {
        full_name
        id
        slug
        public_url
        __typename
    }
    __typename
}
fragment SectionFragment on Section {
    __typename
    id
    title
    slug
    ad_targeting_id
}
fragment ShowFragment on Show {
    id
    title
    url
    dek
    thumbnail_url_1_1
    thumbnail_url_2_3
    thumbnail_url_16_9
    episode_count
    __typename
}
`;

async function fetchLatestFeed() {
  let hasMore = true;
  let page = 34;

  while (hasMore) {
    const variables = {
      locale: "id_id",
      notID: "",
      page: page,
      perPage: 10,
      site: "vice",
      type: "articles"
    };

    try {
      const response = await axios({
        url: "https://www.vice.com/api/v1/graphql",
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          query,
          variables,
        },
      });

      const items = response.data.data.latest;
      if (items.length === 0) {
        hasMore = false;
      }
      const records = items.map((item: any) => {
        const data = item.data;
        console.log(data.body_components_json)
        const body = JSON.parse(data.body_components_json).filter((c: any) => c.role === "body");
        const contentHtml = body.map((component: any) => component.html);
        const contentMd = body.map((component: any) => component.text);
        return {
          id: item.id,
          type: item.type,
          title: data.title,
          publish_date: data.publish_date,
          url: data.url,
          topic: data?.primary_topic?.name ?? "",
          content_html: contentHtml,
          content_md: contentMd,
          summary: data.dek,
          contributors: JSON.stringify(data?.contributions ?? {}),
        };
      });

      await csvWriter
        .writeRecords(records)
        .then(() => {
          console.log(
            `Page ${page} has been appended to CSV file successfully`,
          );
        });

      page += 1;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log("error message: ", error.code, error.response?.data);
        return;
      }
      console.error("Error fetching latest feed:", error);
    }
  }
  console.log("Crawling complete");
}

fetchLatestFeed();
