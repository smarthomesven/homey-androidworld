'use strict';

const Homey = require('homey');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { URL } = require('url');

module.exports = class AndroidworldApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async getAndroidworldFeed() {
    try {
      const rssUrl = "https://androidworld.nl/feed/";
      const { data: xml } = await axios.get(rssUrl, {
        responseType: "text"
      });
      const data = await parseStringPromise(xml, { explicitArray: false });
      const posts = data.rss.channel.item.map(item => ({
        author: item["dc:creator"],
        title: item.title,
        url: item.link,
        pubDate: item.pubDate
      }));
      return posts;
    } catch (error) {
      throw new Error(`Failed to fetch or parse RSS feed: ${error.message}`);
    }
  }


  async onInit() {
    this.log('Androidworld has been initialized');
    this.homey.settings.set('isFirstRun', true);
    this.homey.setInterval(async () => {
      try {
        const posts = await this.getAndroidworldFeed();
        const latestPost = posts[0];
        const lastPostUrl = await this.homey.settings.get('lastPostId');
        const isFirstRun = await this.homey.settings.get('isFirstRun');
        if (isFirstRun) {
          this.homey.settings.set('isFirstRun', false);
          this.homey.settings.set('lastPostUrl', latestPost.url);
          return;
        }
        if (latestPost.url !== lastPostUrl) {
          this.homey.settings.set('lastPostUrl', latestPost.url);
          this.homey.flow.getTriggerCard('new_post').trigger({
            title: latestPost.title,
            url: latestPost.url,
            author: latestPost.author,
            pubDate: latestPost.pubDate
          });
        }
      } catch (error) {
        this.error('Error fetching Androidworld feed:', error);
      }
    } , 15 * 60 * 1000);

  }

};
