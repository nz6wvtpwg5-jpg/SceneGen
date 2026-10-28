'use client';

export default function EditWebSocialMedia() {
    return (
        <div>
        <form>
        <p>
          <label>Website</label>
          <input type="text" id="website" name="website"/>
        </p>
        <p>
            <label>Facebook</label>
            <input type="text" id="facebook" name="facebook"/>
        </p>
        <p>
            <label>Instagram</label>
            <input type="text" id="instagram" name="instagram"/>
        </p>
        <p>
            <label>X</label>
            <input type="text" id="twitter" name="twitter"/>
        </p>
        <p>
            <label>Bandcamp</label>
            <input type="text" id="soundcloud" name="soundcloud"/>
        </p>
        <p>
            <label>Spotify</label>
            <input type="text" id="spotify" name="spotify"/>
        </p>
        </form>
      </div>
    );
}