'use client';

export default function EditUpcomingShows() {
    return (
        <div>
            <p>Display your dates from your BandsInTown profile</p>
            <p>Make sure your artist name is as it appears within your BandsInTown account.</p>

            <form>
            <input type="text" id="bandsintown" name="bandsintown" placeholder="Artist Name"/>
            <select id="bandsintown" name="bandsintown">
            <option value="artist">Timeframe to show</option>
            </select>
            </form>
        </div>
    );
}
