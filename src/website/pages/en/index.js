const React = require('react');

const CompLibrary = require('../../core/CompLibrary.js');
const MarkdownBlock = CompLibrary.MarkdownBlock; /* Used to read markdown */
const Container = CompLibrary.Container;
const GridBlock = CompLibrary.GridBlock;

const siteConfig = require(process.cwd() + '/siteConfig.js');

function imgUrl(img) {
  return siteConfig.baseUrl + 'img/' + img;
}

function pageUrl(page, language) {
  return siteConfig.baseUrl + (language ? language + '/' : '') + page;
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

const SplashContainer = (props) => (
  <div
    className="homeContainer"
    //style={{
    //  background: `url(${imgUrl('background.jpg')})`,
    //  backgroundRepeat: 'no-repeat',
    //  backgroundSize: '100% 100%'
    //}}
  >
    <div className="homeSplashFade">
      <div
        className="wrapper homeWrapper"
        style={{
          display: 'flex'
        }}
      >
        {props.children}
      </div>
    </div>
  </div>
);

const ProjectTitle = () => (
  <h2 className="projectTitle">
    Connect to NexentaEdge
    <small>
      <i>Fast, feature rich and easy to use File, Block and Object storage for your Cloud-Native Applications</i>
    </small>
  </h2>
);

const PromoSection = (props) => (
  <div className="section promoSection">
    <div className="promoRow">
      <div className="pluginRowBlock">{props.children}</div>
    </div>
  </div>
);

class HomeSplash extends React.Component {
  render() {
    return (
      <SplashContainer>
        {/*<div className="inner" style={{padding: '40px 0'}}>*/}
        <section
          style={{
            fontSize: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 25
          }}
        >
          <ProjectTitle />
          <section
            className="headerButtons"
            style={{display: 'flex', justifyContent: 'center', margin: '5px 0 40px 0'}}
          >
            <HeaderButton href="https://nexenta.com/products/nexentaedge" target="_blank">
              <img src={imgUrl('logo-nexenta-edge.png')} style={{height: 64, marginBottom: 0}}/>
              <br />Product Page
            </HeaderButton>
            <HeaderButton href="https://github.com/Nexenta/edge-dev" target="_blank">
              <i className="fab fa-github fa-4x fa-fw" />
              <br />Github
            </HeaderButton>
            <HeaderButton
              href="https://join.slack.com/t/nexentaedge/shared_invite/enQtMzEwMjA5MTczNDU3LTVmNjk4NjEwNTVlYThjMjg4NWI0ZWM5NTBjNTE5YzgwZTFjYjhjMWFhMWY4NjYxYWI0YWJmOTFkNTY5MmI1YWI"
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
        {/*</div>*/}
      </SplashContainer>
    );
  }
}

//const Block = (props) => (
//  <Container padding={['bottom', 'top']} id={props.id} background={props.background}>
//    <GridBlock align="center" contents={props.children} layout={props.layout} />
//  </Container>
//);

//const Features = () => (
//  <Block layout="fourColumn">
//    {[
//      {
//        content: `<ul align="left">
//<li>Advanced Versioned S3 Object Append and RW ”Object as File” access
//<li>S3 Object as a Key-Value database, including integrations with Caffe, TensorFlow, Spark, Kafka, etc
//<li>High-performance Versioned S3 Object Stream Session ”RW”, including FUSE library to mount an object
//<li>Management API for Snapshots and Clones, including Bucket instantaneous snapshots
//<li>Transparent NFS to/from S3 bucket access, “ingest via NFS, read via S3” or vice-versa
//</ul>
//<a class="button" href="https://github.com/Nexenta/edge-dev" target="_blank">Learn More</a>
//`,
//        image: imgUrl('machine_learning_logo.png'),
//        imageAlign: 'top',
//        title: 'Optimized for AI/ML frameworks'
//      },
//      {
//        content: `<ul align="left">
//<li>Deployed as containers and managed using standard container tools
//<li>Micro-services for data access to File ”NFS”, Block ”iSCSI/NBD”, Object ”S3/SWIFT” and NOSQL database
//<li>Global inline deduplication and compression
//<li>Global Name space and built-in Multi-Tenancy
//<li>Enterprise class feature set with built-in data reduction, snapshots, clones and QoS
//<li>Easy administration with DevOps familiar tools, e.g. (upcoming Rook.IO integration)
//</ul>
//<a class="button" href="https://github.com/Nexenta/edge-dev" target="_blank">Learn More</a>
//`,
//        image: imgUrl('microservices_logo.png'),
//        imageAlign: 'top',
//        title: 'Multi-Protocol Persistent Volumes'
//      },
//      {
//        content: `<ul align="left">
//<li>S3 Object as a Key-Value storage database with easy access via Node.JS, Java, Python, C/C++ APIs
//<li>Advanced S3 Object Append and RW access, High-performance versioning
//<li>High-performance S3 Object Stream Session ”POSIX mountable”
//<li>Management API for Snapshots and Clones where any types of objects and buckets can be snapshotted and cloned
//<li>Dynamic data placement and automatic load balancing
//</ul>
//<a class="button" href="https://github.com/Nexenta/edge-dev" target="_blank">Learn More</a>
//`,
//        image: imgUrl('big_data_logo.png'),
//        imageAlign: 'top',
//        title: 'Edge-X S3 API for Big Data and Analytics'
//      }
//    ]}
//  </Block>
//);

class Index extends React.Component {
  render() {
    let language = this.props.language || '';

    return (
      <div>
        <HomeSplash language={language} />
        <div className="mainContainer">
          {/*<Features />*/}
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
                  <Button href="https://github.com/Nexenta/nedge-docker-volume">Docker v1.13 Volume Driver</Button>
                  <Button href="https://github.com/Nexenta/nedge-docker-nfs">Docker v17 NFS Volume Plugin</Button>
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
                  OpenStack Drivers
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
