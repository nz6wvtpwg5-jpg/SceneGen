import React from 'react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { SiFacebook, SiX, SiInstagram } from '@icons-pack/react-simple-icons';

interface ProposalDetailsProps {
  // Add props as needed for the proposal data
  proposalData?: {
    date?: {
      day: string;
      weekday: string;
      month: string;
      fullDate: string;
    };
    title?: string;
    venue?: string;
    location?: string;
    tags?: string[];
    lineup?: string[];
    promoter?: {
      name: string;
      location: string;
      bio: string;
      avatar: string;
      affiliations: string[];
      pastEvents: string[];
    };
  };
}

/**
 * Component to display the details of a proposal in the sidebar
 */
const ProposalDetails: React.FC<ProposalDetailsProps> = ({ proposalData }) => {
  // Use default data if none is provided
  const defaultData = {
    date: {
      day: "27",
      weekday: "Friday",
      month: "August",
      fullDate: "August 27th, 2021"
    },
    title: "Summer Meltdown",
    venue: "Underworld",
    location: "London, UK",
    tags: ["metal", "thrashmetal", "speedmetal"],
    lineup: ["Snake Racer", "Jammy Dodger Massacre", "Blahsthphemy", "Trash Goblin"],
    promoter: {
      name: "Keon LaStrade",
      location: "London, UK",
      bio: "Booking #metal #goth #industrial #punk and #noise",
      avatar: "https://imgcdn.stablediffusionweb.com/2024/3/22/f32ab3e7-b75c-41c5-b4bd-e5862db28fa2.jpg",
      affiliations: ["London Underworld", "The Biz", "Motor Club"],
      pastEvents: ["Thrash Metal Fest 2023", "Winter Doom 2022", "Underground Series 2021", "Metal Mayhem 2020", "Hardcore Weekend 2019"]
    }
  };
  
  // Merge provided data with defaults to ensure all properties exist
  const data = {
    date: { ...defaultData.date, ...proposalData?.date },
    title: proposalData?.title || defaultData.title,
    venue: proposalData?.venue || defaultData.venue,
    location: proposalData?.location || defaultData.location,
    tags: proposalData?.tags || defaultData.tags,
    lineup: proposalData?.lineup || defaultData.lineup,
    promoter: { ...defaultData.promoter, ...proposalData?.promoter }
  };

  return (
    <div className="h-screen bg-gray2 overflow-hidden">
      <ScrollArea className="h-screen">
        <div className="p-4">
          <p className="heading-1 text-center">Current Proposal</p>
          <div className="w-100 h-[100px] bg-volcano4 mt-10 rounded-[10px] p-3">
            {/* weekday */}
            <p className="text-xs leading-tight text-center uppercase font-semibold">
              {data.date.weekday}
            </p>
            {/* day */}
            <p className="text-[38px] leading-[46px] text-center uppercase m-0 font-semibold">
              {data.date.day}
            </p>
            {/* month */}
            <p className="text-xs leading-tight text-center uppercase font-semibold">
              {data.date.month}
            </p>
          </div>
          <div className="my-[12px] pb-[40px] border-b-[1px] border-b-[#5a5a5a] ">
            <p className="text-center text-s font-semibold text-[#D89614]">
              {data.date.fullDate}
            </p>
            <p className="text-center text-[24px] leading-[32px] text-white">
              {data.title}
            </p>
            <p className="text-center">
              At <u>{data.venue}</u> in {data.location}
            </p>
            <p className="text-center text-[#7d7d7d] mb-[32px]">
              {data.tags.map(tag => `#${tag}`).join(', ')}
            </p>
            <p className="text-center">
              <span className="uppercase text-[#7d7d7d]">Lineup</span>: {data.lineup.join(', ')}
            </p>
            <p className="mt-[32px] text-center mb-[30px]">
              <u>View Show Page</u>
            </p>
            <button className="w-[100%] h-[40px] text-center bg-[#AA6215] my-[10px]">
              Review Day Sheet
            </button>
            <button className="w-[100%] h-[40px] text-center bg-[#AA6215] my-[10px]">
              Review Compensation
            </button>
            <button className="w-[100%] h-[40px] text-center bg-[#AA6215] my-[10px]">
              Review Contract
            </button>
          </div>
          <div className="my-[40px] text-center">
            <p className="heading-1 mb-[40px]">Promoter Profile</p>
            <div className="w-[100px] h-[100px] mx-[auto] my-[40px] rounded-[50%] overflow-hidden">
              <img
                src={data.promoter.avatar}
                alt="Promoter avatar"
              />
            </div>
            <p className="text-white text-2xl leading-loose font-semibold">{data.promoter.name}</p>
            <p className="text-[#7d7d7d] text-2xl leading-loose">{data.promoter.location}</p>
            <p className="text-[#7d7d7d] text-base">{data.promoter.bio}</p>
            
            <p className="uppercase my-[40px] text-[#7d7d7d]">Affiliations</p>
            {data.promoter.affiliations.map((affiliation, index) => (
              <p key={index} className="text-[#d84a1b]">{affiliation}</p>
            ))}

            <p className="uppercase my-[40px] text-[#7d7d7d]">Social Media</p>
            <div className="flex justify-around">
              <SiFacebook color="#fff" size={24} />
              <SiInstagram color="#fff" size={24} />
              <SiX color="#fff" size={24} />
            </div>

            <p className="uppercase my-[40px] text-[#7d7d7d]">Past Events</p>
            {data.promoter.pastEvents.map((event, index) => (
              <p key={index} className="text-[#d84a1b]">{event}</p>
            ))}
            
            {/* Extra space to ensure scrolling works */}
            <div className="pb-20"></div>
          </div>
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
};

export default ProposalDetails;
