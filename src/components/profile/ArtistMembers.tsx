'use client'

interface Member {
    name: string;
    responsibility: string;
    id: string | null;
}

export default function ArtistMembers({ members }: { members: Member[] | string }) {
    if (typeof members === 'string') {
        return (
            <div className="my-[15px]">
                <p className="page-subheading">Members</p>
                <p>{members}</p>
            </div>
        );
    }

    return (
        <div className="my-[15px]">
            <p className="page-subheading">Members</p>
            {members.map((member, index) => (
                <p key={member.id || index}>
                    {member.responsibility} <br /> {member.name}
                </p>
            ))}
        </div>
    );
}