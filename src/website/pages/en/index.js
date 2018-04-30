const React = require('react');
const siteConfig = require(process.cwd() + '/siteConfig.js');

function imgUrl(img) {
  return siteConfig.baseUrl + 'img/' + img;
}

class HeaderButton extends React.Component {
  render() {
    return (
      <div style={{textAlign: 'center', margin: '0 15px'}}>
        <a href={this.props.href} target={this.props.target}>
          {this.props.children}
        </a>
      </div>
    );
  }
}

class Button extends React.Component {
  render() {
    return (
      <div className="pluginWrapper buttonWrapper">
        <a className="button" href={this.props.href} target={this.props.target}>
          {this.props.children}
        </a>
      </div>
    );
  }
}

Button.defaultProps = {
  target: '_self'
};

class Index extends React.Component {
  render() {
    return (
      <div>
        <div className="homeContainer">
          <div className="homeSplashFade">
            <div className="wrapper homeWrapper" style={{display: 'flex'}}>
              <section
                style={{
                  fontSize: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingTop: 25
                }}
              >
                <h2 className="projectTitle">
                  Connect to NexentaEdge
                  <small>
                    <i>
                      Fast, feature rich and easy to use File, Block and Object storage for your Cloud-Native
                      Applications
                    </i>
                  </small>
                </h2>
                <section
                  className="headerButtons"
                  style={{display: 'flex', justifyContent: 'center', margin: '5px 0 40px 0'}}
                >
                  <HeaderButton href="https://nexenta.com/products/nexentaedge" target="_blank">
                    <img src={imgUrl('logo-nexenta-edge.png')} style={{height: 64, marginLeft: 3}} />
                    <br />Product Page
                  </HeaderButton>
                  <HeaderButton href="https://github.com/Nexenta/edge-dev" target="_blank">
                    <i className="fab fa-github fa-4x fa-fw" />
                    <br />Github
                  </HeaderButton>
                  <HeaderButton
                    href="https://join.slack.com/t/nexentaedge/shared_invite/enQtMzU0NDgzMzE1MzEyLWYzMDBmMmU2Nzc2OGYxNDhhYWUxY2JmNTZhMjI0ZWExZjNhYjIzN2M4NDgyMjg1YzQwMTcwYzAyZGYwZmEwMWE"
                    target="_blank"
                  >
                    <i className="fab fa-slack fa-4x fa-fw" />
                    <br />Slack
                  </HeaderButton>
                  <HeaderButton href="https://twitter.com/nexenta" target="_blank">
                    <i className="fab fa-twitter fa-4x fa-fw" />
                    <br />Twitter
                  </HeaderButton>
                  <HeaderButton href="https://groups.google.com/forum/#!forum/nexentaedge-users" target="_blank">
                    <i className="fab fa-google fa-4x fa-fw" />
                    <br />Google Group
                  </HeaderButton>
                </section>
              </section>
            </div>
          </div>
        </div>
        <div className="mainContainer">
          <section className="container" style={{backgroundColor: '#f3f3f3', padding: '0 0 50px 0'}}>
            <section className="band band-container">
              <section style={{paddingTop: 40}}>
                <h2>Try Online</h2>
                <p>Deploy NexentaEdge cluster online, no hardware required</p>
                <Button href="https://www.katacoda.com/courses/nexenta/single-s3">
                  <i className="fas fa-globe fa-lg fa-fw" /> Try Online
                </Button>
              </section>
              <img
                src={imgUrl('katacoda-nedge.png')}
                style={{
                  height: 220,
                  border: '1px solid rgb(221, 221, 221)',
                  boxShadow: '3px 3px 4px 1px #ddd',
                  marginLeft: 20,
                  marginTop: 15
                }}
              />
            </section>
          </section>
          <section className="container" style={{backgroundColor: '#e6e6e6', padding: '35px 0 50px 0'}}>
            <section className="band band-container">
              <img src={imgUrl('logo-docker.svg')} style={{height: 120, marginRight: 20, marginTop: 5}} />
              <section>
                <h2>Docker Drivers</h2>
                <p>Get the latest volume plugins and drivers for block and NFS for NexentaEdge</p>
                <section style={{display: 'flex'}}>
                  <Button href="https://hub.docker.com/r/nexenta/nexentaedge-nfs-plugin/">Download Plugin</Button>
                  <Button href="https://github.com/Nexenta/nedge-docker-nfs/tree/stable/v17">Source Code</Button>
                </section>
              </section>
            </section>
          </section>
          <section className="container" style={{backgroundColor: '#f5f5f5', padding: '35px 0 50px 0'}}>
            <section className="band band-container">
              <section>
                <h2>OpenStack Drivers</h2>
                <p>Get the latest Cinder block and file drivers for NexentaEdge</p>
                <Button href="https://github.com/Nexenta/cinder/tree/stable/queens/cinder/volume/drivers/nexenta">
                  Download Drivers
                </Button>
              </section>
              <img src={imgUrl('logo-openstack.png')} style={{height: 100, marginLeft: 20, marginTop: 15}} />
            </section>
          </section>
        </div>
      </div>
    );
  }
}

module.exports = Index;
