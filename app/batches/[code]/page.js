import BatchPassport from "@/components/public/BatchPassport";

export const metadata={title:"Hồ sơ lô trà — House of Hoàng Long",robots:{index:false,follow:false}};

export default async function BatchPage({params}){const {code}=await params;return <BatchPassport code={decodeURIComponent(code)}/>}
