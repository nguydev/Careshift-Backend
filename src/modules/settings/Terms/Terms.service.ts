import { TermsModel } from "./Terms.model";

type TermsData = {
  sanitizedContent: string;
};

export const createTermsInDB = async (termsData: TermsData) => {
  const newTerms = new TermsModel({ description: termsData.sanitizedContent });
  const savedTerms = await newTerms.save();
  return savedTerms;
};

export const getAllTermsFromDB = async () => {
  const terms = await TermsModel.find().sort({ createdAt: -1 });
   console.log();
   
  return terms;
};

export const updateTermsInDB = async (newData: string) => {
    console.log(newData);
    
  const updatedTerms = await TermsModel.findOneAndUpdate(
    {},
    { description: newData },
    { new: true, upsert: true },
  );
 console.log(updatedTerms);
 
  return updatedTerms;
};
