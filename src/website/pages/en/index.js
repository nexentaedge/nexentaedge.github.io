const React = require('react');

const CompLibrary = require('../../core/CompLibrary.js');
const MarkdownBlock = CompLibrary.MarkdownBlock; /* Used to read markdown */
const Container = CompLibrary.Container;
const GridBlock = CompLibrary.GridBlock;

const siteConfig = require(process.cwd() + '/siteConfig.js');

function imgUrl(img) {
  return siteConfig.baseUrl + 'img/' + img;
}

function docUrl(doc, language) {
  return siteConfig.baseUrl + 'docs/' + (language ? language + '/' : '') + doc;
}

function pageUrl(page, language) {
  return siteConfig.baseUrl + (language ? language + '/' : '') + page;
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
  <div className="homeContainer" style={{
    background: `url(${imgUrl('background.jpg')})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%'
  }}>
    <div className="homeSplashFade">
      <div className="wrapper homeWrapper">{props.children}</div>
    </div>
  </div>
);

const Logo = (props) => (
  <div className="projectLogo" style={{paddingRight: 70}}>
    <img src={props.img_src} />
  </div>
);

const ProjectTitle = () => (
  <h2 className="projectTitle">
    {siteConfig.title}
    <small><i>{siteConfig.tagline}</i></small>
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
    //let language = this.props.language || '';
    return (
      <SplashContainer>
        {/*<Logo img_src={imgUrl('background.jpg')} />*/}
        <div className="inner">
          <ProjectTitle />
          <PromoSection>
            <Button href="https://github.com/Nexenta/edge-dev" target="_blank">Github</Button>
            <Button href="https://twitter.com/nexenta" target="_blank">Twitter</Button>
            <Button href="https://join.slack.com/t/nexentaedge/shared_invite/enQtMzEwMjA5MTczNDU3LTVmNjk4NjEwNTVlYThjMjg4NWI0ZWM5NTBjNTE5YzgwZTFjYjhjMWFhMWY4NjYxYWI0YWJmOTFkNTY5MmI1YWI" target="_blank">Slack</Button>
            {/*<Button href={docUrl('doc1.html', language)}>Example Link</Button>*/}
          </PromoSection>
        </div>
      </SplashContainer>
    );
  }
}

const Block = (props) => (
  <Container padding={['bottom', 'top']} id={props.id} background={props.background}>
    <GridBlock align="center" contents={props.children} layout={props.layout} />
  </Container>
);

const Features = (props) => (
  <Block layout="fourColumn">
    {[
      {
        content: 'Avoids unnecessary copy, fetch only needed datasets',
        //image: imgUrl('logo-nexenta-edge.png'),
        imageAlign: 'top',
        title: 'S3 objects for fast File/POSIX access'
      },
      {
        content: 'With global inline de-duplication, compression and erasure encoding',
        //image: imgUrl('logo-nexenta-edge.png'),
        imageAlign: 'top',
        title: 'Data Reduction'
      },
      {
        content: 'File/Block/DB access with S3 economics',
        //image: imgUrl('logo-nexenta-edge.png'),
        imageAlign: 'top',
        title: 'Cost Reduction'
      }
    ]}
  </Block>
);

const FeatureCallout = (props) => (
  <div className="productShowcaseSection paddingBottom" style={{textAlign: 'center'}}>
    <MarkdownBlock>
      NexentaEdge is ideal solution if you want to consolidate multiple data protocol access into one with globally
      enabled deduplication across all the high-level protocols: S3, SWIFT, NFS, iSCSI, NBD and NOSQL.
    </MarkdownBlock>
    {/*<h2>And more</h2>*/}
    {/*<ul style={{maxWidth: 900, margin: '0 auto'}}>*/}
    {/*<li>&#8226; Advanced Versioned S3 Object Append and RW "Object as File" access</li>*/}
    {/*<li>&#8226; S3 Object as a Key-Value database, including integrations w/ Caffe, TensorFlow, Spark, Kafka, etc</li>*/}
    {/*<li>*/}
    {/*&#8226; High-performance Versioned S3 Object Stream Session (RW), including FUSE library to mount an object*/}
    {/*</li>*/}
    {/*<li>&#8226; Management API for Snapshots and Clones, including Bucket instantaneous snapshots</li>*/}
    {/*<li>&#8226; Transparent NFS to/from S3 bucket access, "ingest via NFS, read via S3" or vice-versa.</li>*/}
    {/*</ul>*/}
  </div>
);

const LearnHow = (props) => (
  <Block background="light">
    {[
      {
        content: 'Talk about learning how to use this',
        image: imgUrl('logo-nexenta-edge.png'),
        imageAlign: 'right',
        title: 'Learn How'
      }
    ]}
  </Block>
);

const TryOut = (props) => (
  <Block id="try">
    {[
      {
        content: 'Talk about trying this out',
        image: imgUrl('logo-nexenta-edge.png'),
        imageAlign: 'left',
        title: 'Try it Out'
      }
    ]}
  </Block>
);

const Description = (props) => (
  <Block background="dark">
    {[
      {
        content:
          'NexentaEdge DevOps Edition is a purpose built and packaged software stack to enable scale-out storage infrastructure for containerized applications. It is designed to make it easy to integrate an enterprise class storage system with existing networking and compute services as a solution.',
        image: imgUrl('logo-nexenta-edge.png'),
        imageAlign: 'right',
        title: ''
      }
    ]}
  </Block>
);

const Showcase = (props) => {
  if ((siteConfig.users || []).length === 0) {
    return null;
  }
  const showcase = siteConfig.users
    .filter((user) => {
      return user.pinned;
    })
    .map((user, i) => {
      return (
        <a href={user.infoLink} key={i}>
          <img src={user.image} title={user.caption} />
        </a>
      );
    });

  return (
    <div className="productShowcaseSection paddingBottom">
      <h2>{"Who's Using This?"}</h2>
      <p>This project is used by all these people</p>
      <div className="logos">{showcase}</div>
      <div className="more-users">
        <a className="button" href={pageUrl('users.html', props.language)}>
          More {siteConfig.title} Users
        </a>
      </div>
    </div>
  );
};

class Index extends React.Component {
  render() {
    let language = this.props.language || '';

    return (
      <div>
        <HomeSplash language={language} />
        <div className="mainContainer">
          <Features />
          <FeatureCallout />
          <LearnHow />
          <TryOut />
          <Description />
          <Showcase language={language} />
        </div>
      </div>
    );
  }
}

module.exports = Index;
