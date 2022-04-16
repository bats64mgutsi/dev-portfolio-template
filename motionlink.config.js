const markdownService = require("motionlink-cli/lib/services/markdown_service");
const ObjectTransformers = markdownService.ObjectTransformers;
const BlockTransformers = markdownService.BlockTransformers;

const showdown = require("showdown");

const allFilter = {
  or: [
    {
      property: "Status",
      select: {
        equals: "Published",
      },
    },
    {
      property: "Status",
      select: {
        equals: "Completed",
      },
    },
    {
      property: "Status",
      select: {
        equals: "Public",
      },
    },
  ],
};

/** @type {import("motionlink-cli/lib/models/config_models").TemplateRule[]} */
const rules = [
  {
    template: "index.template.html",
    outDir: ".",
    uses: {
      database: "personalInformation",
      takeOnly: 1,
      fetchBlocks: true,
      filter: allFilter,
      map: (page, ctx) => {
        const aboutMeMarkdown = ctx.genMarkdownForBlocks(page.blocks);

        page.otherData.aboutMe = new showdown.Converter().makeHtml(
          aboutMeMarkdown
        );

        page.otherData.personName = ObjectTransformers.transform_all(
          page.data.properties.Name.title
        );
        page.otherData.headline = ObjectTransformers.transform_all(
          page.data.properties.Headline.rich_text
        );

        page.otherData.year = new Date().getFullYear();
        page.otherData.email = page.data.properties.Email.email;
        page.otherData.github = page.data.properties.Github.url;
        page.otherData.linkedin = page.data.properties.Linkedin.url;
        page.otherData.twitter = page.data.properties.Twitter.url;
        page.otherData.medium = page.data.properties.Medium.url;

        page.otherData.topSkills =
          page.data.properties.TopSkills.multi_select.map(
            (skill) => skill.name
          );

        page.otherData.latestProjects = ctx.others.latestProjects.pages.map(
          (page) => page.otherData
        );

        page.otherData.education = ctx.others.education.pages.map(
          (page) => page.otherData
        );

        page.otherData.experience = ctx.others.experience.pages.map(
          (page) => page.otherData
        );

        page._title = "index";
        return page;
      },
    },
    alsoUses: [
      {
        database: "education",
        fetchBlocks: true,
        map: (page, ctx) => {
          page.otherData.institution = ObjectTransformers.transform_all(
            page.data.properties.Name.title
          );

          page.otherData.qualification = ObjectTransformers.transform_all(
            page.data.properties.Qualification.rich_text
          );

          page.otherData.description = ctx.genMarkdownForBlocks(page.blocks);

          page.otherData.period = ObjectTransformers.transform_all(
            page.data.properties.Period.rich_text
          );

          return page;
        },
      },
      {
        database: "experience",
        fetchBlocks: true,
        filter: allFilter,
        sort: [
          {
            timestamp: "created_time",
            direction: "descending",
          },
        ],
        map: (page, ctx) => {
          page.otherData.companyName = ObjectTransformers.transform_all(
            page.data.properties.Name.title
          );

          page.otherData.role = page.data.properties.Role.select.name;
          page.otherData.description = ctx.genMarkdownForBlocks(page.blocks);

          page.otherData.period = ObjectTransformers.transform_all(
            page.data.properties.Period.rich_text
          );

          return page;
        },
      },
      {
        database: "latestProjects",
        takeOnly: 3,
        fetchBlocks: true,
        filter: allFilter,
        sort: [
          {
            timestamp: "last_edited_time",
            direction: "descending",
          },
        ],
        map: (page, context) => {
          page.otherData.name = ObjectTransformers.transform_all(
            page.data.properties.Name.title
          );

          // The page thumbnail is the first image in the page
          const defaultImageBlockTransformer = BlockTransformers.image;

          /**@type {import("motionlink-cli/lib/models/config_models").NotionBlock}*/
          let thumbnailBlock = undefined;
          BlockTransformers.image = (block, rule) => {
            if (block.type === "image") {
              if (thumbnailBlock === undefined) {
                thumbnailBlock = {
                  data: block,
                  children: [],
                };

                return "";
              } else {
                return defaultImageBlockTransformer(block, rule);
              }
            }

            return "";
          };

          page.otherData.description = context.genMarkdownForBlocks(
            page.blocks
          );

          if (thumbnailBlock === undefined) {
            throw new Error(
              "This page does not have a thumbnail. All pages must have a thumbnail."
            );
          }

          if (thumbnailBlock.data.type === "image") {
            const thumbnailMedia = context.fetchMedia(
              // @ts-ignore
              thumbnailBlock.data.image
            );

            page.otherData.logoUrl = thumbnailMedia.src;
          }

          page.otherData.url = page.data.properties.Link.url;
          return page;
        },
      },
    ],
  },
];

module.exports = rules;
