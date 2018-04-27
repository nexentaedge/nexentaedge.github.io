/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');

class Footer extends React.Component {
  docUrl(doc, language) {
    const baseUrl = this.props.config.baseUrl;
    return baseUrl + 'docs/' + (language ? language + '/' : '') + doc;
  }

  pageUrl(doc, language) {
    const baseUrl = this.props.config.baseUrl;
    return baseUrl + (language ? language + '/' : '') + doc;
  }

  render() {
    const currentYear = new Date().getFullYear();
    return (
      <footer className="nav-footer" id="footer">
        <section
          style={{
            fontSize: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 10
          }}
        >
          <img src={this.props.config.baseUrl + 'img/logo-nexenta-edge.png'} style={{height: 60, marginBottom: 10}}/>
          <a href="https://nexenta.com/products/nexentaedge" style={{paddingBottom: 20}}>
            NexentaEdge Product Page
          </a>
        </section>
        <section className="copyright">Copyright &copy; {currentYear} Nexenta Systems, Inc.</section>
      </footer>
    );
  }
}

module.exports = Footer;
