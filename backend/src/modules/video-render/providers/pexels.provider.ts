import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  video_files: {
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
}

class PexelsProvider {
  private api = axios.create({
    baseURL: 'https://api.pexels.com/videos',
    headers: {
      Authorization: process.env.PEXELS_API_KEY ?? '',
    },
  });

  async search(query: string): Promise<PexelsVideo[]> {
    const { data } = await this.api.get('/search', {
      params: {
        query,
        per_page: 10,
      },
    });

    return data.videos ?? [];
  }

  async download(video: PexelsVideo): Promise<string> {
    const file =
      video.video_files.find(
        v =>
          v.quality === 'hd' &&
          v.file_type === 'video/mp4',
      ) ?? video.video_files[0];

    if (!file) {
      throw new Error('Nenhum arquivo disponível.');
    }

    const dir = path.resolve('storage/videos');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `${video.id}.mp4`;
    const destination = path.join(dir, filename);

    const response = await axios.get(file.link, {
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(destination);

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    return destination;
  }

  async searchAndDownload(query: string): Promise<string> {
    const videos = await this.search(query);

    if (!videos.length) {
      throw new Error(`Nenhum vídeo encontrado para "${query}"`);
    }

    return this.download(videos[0]);
  }
}

export const pexelsProvider = new PexelsProvider();
