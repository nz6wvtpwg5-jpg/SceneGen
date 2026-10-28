"use client";

import React from "react";
import CountryList from "@/components/ui/CountryList";
import UsStatesList from "@/components/ui/UsStatesList";
import CanadaProvinceList from "@/components/ui/CanadaProvinceList";
import AustraliaStateList from "@/components/ui/AustraliaStateList";

// Countries that have states/provinces
const COUNTRIES_WITH_STATES = ["United States", "Canada", "Australia"];

export default function EditArtistInformation() {
  const [selectedCountry, setSelectedCountry] = React.useState("");
  const [selectedState, setSelectedState] = React.useState("");

  return (
    <div className="flex my-[30px]">
      <form className="w-[75%] max-w-[715px] mr-[40px]">
        <div className="flex justify-between mb-[30px]">
          <div
            className={`${
              COUNTRIES_WITH_STATES.includes(selectedCountry)
                ? "w-[40%]"
                : "w-1/2"
            } pr-[15px] transition-all duration-300 ease-in-out`}
          >
            <label
              htmlFor="country"
              className="text-[14px] line-height-[22px] font-[400] text-[#acacac] mb-[8px]"
            >
              Country
            </label>
            <br />
            <CountryList
              value={selectedCountry}
              onChange={setSelectedCountry}
            />
          </div>
          <div
            className={`${
              COUNTRIES_WITH_STATES.includes(selectedCountry)
                ? "w-[35%]"
                : "w-1/2"
            } ${
              COUNTRIES_WITH_STATES.includes(selectedCountry)
                ? "px-[15px]"
                : "pl-[15px]"
            } transition-all duration-300 ease-in-out`}
          >
            <label
              htmlFor="city"
              className="text-[14px] line-height-[22px] font-[400] text-[#acacac]"
            >
              City
            </label>
            <br />
            <input
              type="text"
              id="city"
              name="city"
              className="bg-[#1d1d1d] border-[#434343] w-full py-[5px] px-[12px] rounded-[2px]"
            />
          </div>
          <div
            className={`w-[25%] pl-[15px] transition-all duration-300 ease-in-out transform ${
              COUNTRIES_WITH_STATES.includes(selectedCountry)
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-full w-0 pl-0"
            } overflow-hidden`}
          >
            <label
              htmlFor="state"
              className="text-[14px] line-height-[22px] font-[400] text-[#acacac]"
            >
              {selectedCountry === "CA" ? "Province" : "State"}
            </label>
            <br />
            {(() => {
              const commonProps = {
                className:
                  "bg-[#1d1d1d] border-[#434343] w-full py-[5px] px-[12px] rounded-[2px]",
                value: selectedState,
                onChange: setSelectedState,
              };

              switch (selectedCountry) {
                case "CA":
                  return <CanadaProvinceList {...commonProps} />;
                case "AU":
                  return <AustraliaStateList {...commonProps} />;
                default:
                  return <UsStatesList {...commonProps} />;
              }
            })()}
          </div>
        </div>

        <div className="mb-[30px]">
          <label
            htmlFor="genre"
            className="text-[14px] line-height-[22px] font-[400] text-[#acacac]"
          >
            Genres
          </label>
          <br />
          <input
            type="text"
            id="genre"
            name="genre"
            placeholder="Enter genre names separated by commas"
            className="bg-[#1d1d1d] border-[#434343] w-full py-[5px] px-[12px] rounded-[2px]"
          />
        </div>

        <div className="mb-[30px]">
          <label
            htmlFor="bio"
            className="text-[14px] line-height-[22px] font-[400] text-[#acacac]"
          >
            Artist Bio
          </label>
          <br />
          <textarea
            id="bio"
            name="bio"
            placeholder="Hailing from the cold north of Middle Earth..."
            className="bg-[#1d1d1d] border-[#434343] w-full py-[5px] px-[12px] rounded-[2px] h-[90px]"
          ></textarea>
        </div>

        <div className="flex justify-between">
          <div className="w-[48%] max-w-[347px] mr-[30px]">
            <p className="text-[14px] line-height-[22px] font-[400] text-[#acacac] mb-[8px]">
              Member Name
            </p>
            <input
              type="text"
              id="members"
              name="members"
              placeholder="Enter member names separated by commas"
              className="bg-[#1d1d1d] border-[#434343] w-full py-[5px] px-[12px] rounded-[2px] mb-[24px]"
            />
            <input
              type="text"
              id="members"
              name="members"
              placeholder="Enter member names separated by commas"
              className="bg-[#1d1d1d] border-[#434343] w-full py-[5px] px-[12px] rounded-[2px] mb-[24px]"
            />
            <input
              type="text"
              id="members"
              name="members"
              placeholder="Enter member names separated by commas"
              className="bg-[#1d1d1d] border-[#434343] w-full py-[5px] px-[12px] rounded-[2px] mb-[24px]"
            />
          </div>
          <div className="w-[48%] max-w-[347px]">
            <p className="text-[14px] line-height-[22px] font-[400] text-[#acacac] mb-[8px]">
              Responsibility
            </p>
            <input
              type="text"
              id="members"
              name="members"
              placeholder="Enter member names separated by commas"
              className="bg-[#1d1d1d] border-[#434343] w-full py-[5px] px-[12px] rounded-[2px] mb-[24px]"
            />
            <input
              type="text"
              id="members"
              name="members"
              placeholder="Enter member names separated by commas"
              className="bg-[#1d1d1d] border-[#434343] w-full py-[5px] px-[12px] rounded-[2px] mb-[24px]"
            />
            <input
              type="text"
              id="members"
              name="members"
              placeholder="Enter member names separated by commas"
              className="bg-[#1d1d1d] border-[#434343] w-full py-[5px] px-[12px] rounded-[2px] mb-[24px]"
            />
          </div>
        </div>
        <p className="text-[16px] line-height-[24px] font-[400] text-[#d84a1b]">
          + Add Another Member
        </p>
      </form>
      <div className="w-[25%]">
        <div className="mb-[30px]">
          <p>Page Header</p>
          <div className="w-full max-w-345px h-[144px] bg-[#1d1d1d] border-[#434343] rounded-[2px] my-[16px]"></div>
          <input type="file" id="profile-image" name="profile-image" />
        </div>

        <div className="mb-[30px]">
          <p>Logo</p>
          <div className="w-full max-w-345px h-[144px] bg-[#1d1d1d] border-[#434343] rounded-[2px] my-[16px]"></div>
          <input type="file" id="logo" name="logo" />
        </div>

        <div className="mb-[30px]">
          <p>Promo Photo</p>
          <div className="w-full max-w-345px h-[144px] bg-[#1d1d1d] border-[#434343] rounded-[2px] my-[16px]"></div>
          <input type="file" id="promo-photo" name="promo-photo" />
        </div>

        <div className="mb-[30px]">
          <p>EPK as PDF</p>
          <input type="file" id="epk-pdf" name="epk-pdf" />
        </div>

        <p className="text-[20px] line-height-[28px] font-[400] text-[#ffffff] mb-[8px]">
          Promoter-Only Files & Images
        </p>
        <p className="text-[14px] line-height-[22px] font-[400] text-[#acacac] mb-[24px]">
          This is a great place for your stage plot, hospitality & tech riders,
          or your contract. Only promoters you're doing a show with will have
          access to these files, and they download them from here any time.
        </p>
        <input
          type="file"
          id="promoter-only-files"
          name="promoter-only-files"
        />
      </div>
    </div>
  );
}
