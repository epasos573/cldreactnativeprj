/**
 * Source: https://github.com/hossein-zare/react-native-chunk-upload
 *
 * Modified the custom Headers to match Cloudinary requirements
 * Date: 31 October 2022
 *
 */

import RNFetchBlob from "rn-fetch-blob";
import RNFS from "react-native-fs";

class ChunkUpload {
  constructor(props) {
    this.data = {
      path: String(props.path),
      size: parseInt(props.size),
      fileName: String(props.fileName),
      fileSize: parseInt(props.fileSize),
      fileIdentity: this.generateFileIdentity(),
      fileShortId: null,
      destinationPath: RNFS.TemporaryDirectoryPath,
      totalNumber: 0,
      xCldUniqueUploadId: props.XUniqueUploadId,
    };

    if (Platform.OS === "ios") {
      this.data.path = this.data.path
        .replace("file://", "")
        .replaceAll("%20", " ");
    }

    this.chunks = [];
    this.level = 0;
    this.file = null;

    this.chunkstart = 0;
    this.chunkend = 0;

    this.data.fileShortId = this.data.fileIdentity.substr(0, 10);
    this.data.totalNumber = this.getTotalNumber();

    // Errors
    this.onFetchBlobError = props.onFetchBlobError;
    this.onWriteFileError = props.onWriteFileError;
  }

  digIn(event = () => {}) {
    this.event = event;

    this.getBase64Chunks();
  }

  async getBase64Chunks() {
    let i = 0;

    await RNFetchBlob.fs
      .readStream(this.data.path, "base64", this.data.size)
      .then((ifstream) => {
        ifstream.open();

        ifstream.onData((chunk) => {
          i++;
          this.chunks.push(chunk);

          if (i === 1) this.next();
        });

        ifstream.onError((e) => this.onFetchBlobError(e));

        ifstream.onEnd(() => {
          //
        });
      });
  }

  async next() {
    this.level++;

    if (this.level > 1) {
      await this.unlink(this.file.path);
    }

    this.store(this.level);
  }

  retry() {
    this.eject();
  }

  async store(index) {
    let chunk = null;

    while (true) {
      if (index <= this.chunks.length) {
        chunk = this.chunks[index - 1];

        break;
      }
    }

    const path = `${this.data.destinationPath}/chunk-${this.data.fileShortId}-${index}.tmp`;

    await RNFetchBlob.fs
      .writeFile(path, chunk, "base64")
      .then(() => {
        this.chunkend = this.chunkstart + this.data.size - 1;

        this.file = {
          number: index,
          path,
          headers: this.getHeaders(index),
          blob: this.getBlobObject(path),
        };
      })
      .catch((e) => {
        this.onWriteFileError(e);
      });

    this.eject();
  }

  eject() {
    this.event(
      this.file,
      this.next.bind(this),
      this.retry.bind(this),
      this.unlink.bind(this)
    );
  }

  async unlink(path) {
    await RNFS.unlink(path)
      .then(() => {
        //
      })
      .catch((err) => {
        //
      });
  }

  getBlobObject(path) {
    return {
      name: "blob",
      type: "application/octet-stream",
      uri: "file://" + path,
    };
  }

  getHeaders(index) {
    var chunkdatastart = this.chunkend - this.data.size + 1;
    var chunkdataend =
      this.chunkend >= this.data.fileSize
        ? this.data.fileSize - 1
        : this.chunkend;

    this.chunkstart = this.chunkend + 1;

    return {
      "x-chunk-number": index,
      "x-chunk-total-number": this.data.totalNumber,
      "x-chunk-size": this.data.size,
      "x-file-name": this.data.fileName,
      "x-file-size": this.data.fileSize,
      "x-file-identity": this.data.fileIdentity,
      "X-Unique-Upload-Id": this.data.xCldUniqueUploadId,
      "Content-Range":
        "bytes " +
        chunkdatastart +
        "-" +
        chunkdataend +
        "/" +
        this.data.fileSize,
    };
  }

  generateFileIdentity(length = 32) {
    return [...Array(length)]
      .map(() => (~~(Math.random() * 36)).toString(36))
      .join("");
  }

  getTotalNumber() {
    const total = Math.ceil(this.data.fileSize / this.data.size);

    return total > 0 ? total : 1;
  }
}

ChunkUpload.defaultProps = {
  onFetchBlobError: () => {},
  onWriteFileError: () => {},
};

export default ChunkUpload;
