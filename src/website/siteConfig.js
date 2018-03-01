/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const siteConfig = {
  title: 'NexentaEdge',
  tagline: 'Multi-Service Scale-Out Storage Software at Any Scale',
  url: 'https://nexentaedge.github.io',
  baseUrl: '/',
  projectName: 'nexentaedge.github.io', // or set an env variable PROJECT_NAME
  organizationName: 'nexentaedge', // or set an env variable ORGANIZATION_NAME
  headerLinks: [{doc: 'introduction', label: 'Docs'}, {blog: true, label: 'Blog'}],
  users: [
    //{
    //  caption: "Ericson",
    //  image: "/test-site/img/docusaurus.svg",
    //  infoLink: "https://www.facebook.com",
    //  pinned: true
    //}
  ],
  headerIcon: 'img/logo-nexenta-edge.png',
  footerIcon: 'img/logo-nexenta-edge.png',
  favicon: 'img/favicon.png',
  colors: {
    primaryColor: '#e86b00',
    secondaryColor: '#c6c6c6'
  },
  //fonts: {
  //  myFont: [
  //    "Open Sans",
  //    "-apple-system",
  //    "system-ui"
  //  ]
  //  myOtherFont: [
  //    "-apple-system",
  //    "system-ui"
  //  ]
  //},
  copyright: `Copyright © ${new Date().getFullYear()} Nexenta Systems`,
  highlight: {
    // Highlight.js theme to use for syntax highlighting in code blocks
    theme: 'default'
  },
  scripts: ['https://buttons.github.io/buttons.js'],
  // You may provide arbitrary config keys to be used as needed by your template.
  repoUrl: 'https://github.com/Nexenta/nedge-dev',
  stylesheets: ['/css/fonts.css']
};

module.exports = siteConfig;
