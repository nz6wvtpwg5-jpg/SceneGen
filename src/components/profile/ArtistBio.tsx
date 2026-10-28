'use client'

export default function ArtistBio(props: {bio: string}) {
    return (
        <div className="my-[15px]">
            <p className="page-subheading">Bio</p>
            <p>{props.bio}</p>
        </div>
    )
}
