const React = require('react');
const siteConfig = require(process.cwd() + '/siteConfig.js');

function imgUrl(img) {
  return siteConfig.baseUrl + 'img/' + img;
}

class Openstack extends React.Component {
  render() {
    return (
      <div>
        <div className="homeContainer">
          <section className="container" style={{backgroundColor: '#fff', padding: '20px 0 35px 0'}}>
            <section
              className="band band-container"
              style={{justifyContent: 'space-between', padding: '80px 0 10px 0'}}
            >
              <h2>OpenStack Drivers</h2>
              <section style={{margin: 'auto 20px auto 0'}}>
                <img src={imgUrl('logo-openstack.png')} style={{maxHeight: 70, marginTop: -25}} />
              </section>
            </section>
          </section>
          <section className="container" style={{backgroundColor: '#f0f0f0'}}>
          <section className="band band-container">
            <section className="nexentaSection">
              <h3 style={{fontSize: 28, paddingBottom: 10}}>Cinder</h3>
              <table>
                <thead>
                  <tr>
                    <th>OpenStack Release</th>
                    <th>NexentaEdge 2.x</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Queens</td>
                    <td>
                      <a href="https://github.com/Nexenta/cinder/tree/stable/queens/cinder/volume/drivers/nexenta">
                        Github
                      </a>&nbsp;
                    </td>
                  </tr>
                  <tr>
                    <td>Pike</td>
                    <td>
                      <a href="https://github.com/Nexenta/cinder/tree/stable/pike/cinder/volume/drivers/nexenta">
                        Github
                      </a>&nbsp;
                      <a href="https://docs.openstack.org/cinder/pike/configuration/block-storage/drivers/nexentaedge-driver.html">
                        Docs
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td>Ocata</td>
                    <td>
                      <a href="https://github.com/Nexenta/cinder/tree/stable/ocata/cinder/volume/drivers/nexenta">
                        Github
                      </a>&nbsp;
                      <a href="https://docs.openstack.org/ocata/config-reference/block-storage/drivers/nexentaedge-driver.html">
                        Docs
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td>Newton</td>
                    <td>
                      <a href="https://github.com/Nexenta/cinder/tree/stable/newton/cinder/volume/drivers/nexenta">
                        Github
                      </a>&nbsp;
                      <a href="https://docs.openstack.org/newton/config-reference/block-storage/drivers/nexentaedge-driver.html">
                        Docs
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td>Mitaka</td>
                    <td>
                      <a href="https://github.com/Nexenta/cinder/tree/stable/mitaka/cinder/volume/drivers/nexenta">
                        Github
                      </a>&nbsp;
                      <a href="https://docs.openstack.org/mitaka/config-reference/block-storage/drivers/nexentaedge-driver.html">
                        Docs
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td>Liberty</td>
                    <td>
                      <a href="https://github.com/Nexenta/cinder/tree/stable/liberty/cinder/volume/drivers/nexenta">
                        Github
                      </a>&nbsp;
                    </td>
                  </tr>
                  <tr>
                    <td>Kilo</td>
                    <td>
                      <a href="https://github.com/Nexenta/cinder/tree/stable/kilo/cinder/volume/drivers/nexenta">
                        Github
                      </a>&nbsp;
                    </td>
                  </tr>
                  <tr>
                    <td>Juno</td>
                    <td>
                      <a href="https://github.com/Nexenta/cinder/tree/stable/juno/cinder/volume/drivers/nexenta">
                        Github
                      </a>&nbsp;
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          </section>
          </section>
        </div>
      </div>
    );
  }
}

module.exports = Openstack;
