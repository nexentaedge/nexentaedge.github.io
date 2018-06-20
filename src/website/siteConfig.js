const siteConfig = {
  title: 'NexentaEdge',
  tagline: 'Fast, feature rich and easy to use File, Block and Object storage for your Cloud-Native Applications',
  disableHeaderTitle: true,
  url: 'http://nexentaedge.io',
  baseUrl: '/',
  projectName: 'nexentaedge.github.io', // or set an env variable PROJECT_NAME
  organizationName: 'nexentaedge', // or set an env variable ORGANIZATION_NAME
  headerLinks: [
    {doc: 'introduction', label: 'Documentation'},
    {blog: true, label: 'Blog'}
  ],
  blogSidebarCount: 'ALL',
  users: [
    //{
    //  caption: "Ericson",
    //  image: "/test-site/img/docusaurus.svg",
    //  infoLink: "https://www.facebook.com",
    //  pinned: true
    //}
  ],
  headerIcon: 'img/logo-nexenta-full.png',
  footerIcon: 'img/logo-nexenta.png',
  favicon: 'img/favicon.png',
  colors: {
    primaryColor: '#f37121',
    secondaryColor: '#c6c6c6'
  },
  fonts: {
    myFont: [
      "Open Sans",
      "-apple-system",
      "system-ui",
      "sans-serif"
    ],
    myOtherFont: [
      "Open Sans",
      "-apple-system",
      "system-ui",
      "sans-serif"
    ]
  },
  copyright: `Copyright © ${new Date().getFullYear()} Nexenta Systems`,
  highlight: {
    // Highlight.js theme to use for syntax highlighting in code blocks
    theme: 'default'
  },
  scripts: [
    'https://buttons.github.io/buttons.js',
    'https://use.fontawesome.com/releases/v5.0.8/js/all.js',
    'https://unpkg.com/mermaid@8.0.0-rc.6/dist/mermaid.min.js',
    '/js/main.js'
  ],
  stylesheets: [
      'https://fonts.googleapis.com/css?family=Open+Sans'
  ],
  // You may provide arbitrary config keys to be used as needed by your template.
  repoUrl: 'https://github.com/Nexenta/nedge-dev',
  //stylesheets: ['/css/fonts.css'],
  algolia: {
    apiKey: '839b05a95d1375c54722a0161e78d578',
    indexName: 'nexentaedge'
  },
  editUrl: 'https://github.com/nexentaedge/nexentaedge.github.io/edit/master/src/docs/'
};

module.exports = siteConfig;
