import fetch from 'node-fetch';
import yts from 'yt-search';

const song = async (m, Matrix) => {
  const prefixMatch = m.body.match(/^[\\/!#.]/);
  const prefix = prefixMatch ? prefixMatch[0] : '/';
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  const validCommands = ['song', 'ytmp3', 'music', 'ytmp3doc'];

  if (validCommands.includes(cmd)) {
    if (!text) return m.reply('Please provide a YouTube URL or search query.');

    try {
      await m.react("🕘");

      const sendAudioMessage = async (videoDetails, audioBuffer) => {
        const messageContent = {
          [cmd === 'ytmp3doc' ? 'document' : 'audio']: audioBuffer,
          mimetype: 'audio/mpeg',
          fileName: `${videoDetails.title}.mp3`,
          contextInfo: {
            mentionedJid: [m.sender],
            externalAdReply: {
              title: "↺ |◁   II   ▷|   ♡",
              body: `Now playing: ${videoDetails.title}`,
              thumbnailUrl: videoDetails.thumbnail,
              sourceUrl: videoDetails.url,
              mediaType: 1,
              renderLargerThumbnail: true,
            },
          },
        };
        await Matrix.sendMessage(m.from, messageContent, { quoted: m });
        await m.react("✅");
      };

      const fetchAudioBuffer = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch audio buffer.');
        return response.buffer();
      };

      const isUrl = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/.test(text);
      let videoInfo;

      if (isUrl) {
        const videoId = new URL(text).searchParams.get('v');
        const searchResult = await yts({ videoId });
        videoInfo = searchResult.videos[0];
      } else {
        const searchResult = await yts(text);
        videoInfo = searchResult.videos[0];
        if (!videoInfo) {
          m.reply('Audio not found.');
          await m.react("❌");
          return;
        }
      }

      const apiUrl = `https://matrix-serverless-api.vercel.app/api/ytdl?url=${encodeURIComponent(videoInfo.url)}&type=audio`;

      const apiResponse = await fetch(apiUrl);
      if (!apiResponse.ok) throw new Error('Failed to fetch video details.');
      const { videoDetails, videoURL } = await apiResponse.json();

      const audioBuffer = await fetchAudioBuffer(videoURL);
      await sendAudioMessage(videoDetails, audioBuffer);

    } catch (error) {
      console.error("Error generating response:", error);
      m.reply('Error processing your request.');
      await m.react("❌");
    }
  }
};

export default song;
