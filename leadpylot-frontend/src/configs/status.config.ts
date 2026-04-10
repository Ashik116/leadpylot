export interface StatusConfig {
    name: string;
    backgroundColor: string;
    textColor: string;
}

export const STATUS_CONFIG: StatusConfig[] = [
    {
        name: "Angaben falsch / Tot",
        backgroundColor: "bg-angabenflash px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "Angebot",
        backgroundColor: "bg-angebot px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "BlackBox",
        backgroundColor: "bg-gray-900 px-2 py-1",
        textColor: "text-white"
    },
    {
        name: "Block",
        backgroundColor: "bg-red-200 px-2 py-1",
        textColor: "text-red-900"
    },
    {
        name: "Confirmation",
        backgroundColor: "bg-confirmation px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "Contract",
        backgroundColor: "bg-opening px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "Duplicate",
        backgroundColor: "bg-duplicate px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "Lost",
        backgroundColor: "bg-lost px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "Muslim",
        backgroundColor: "bg-indigo-100 px-2 py-1",
        textColor: "text-indigo-800"
    },
    {
        name: "NE1",
        backgroundColor: "bg-ne1 px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "NE2",
        backgroundColor: "bg-ne2 px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "NE3",
        backgroundColor: "bg-ne3 px-2 py-1  ",
        textColor: "text-black"
    },
    {
        name: "NE4",
        backgroundColor: "bg-ne4 px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "Netto1",
        backgroundColor: "bg-netto1 px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "Netto2",
        backgroundColor: "bg-netto2 px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "New",
        backgroundColor: "bg-new px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "Nicht angefragt / Scherzanfrage",
        backgroundColor: "bg-pink-100 px-2 py-1",
        textColor: "text-pink-800"
    },
    {
        name: "Nie erreicht",
        backgroundColor: "bg-gray-200 px-2 py-1",
        textColor: "text-gray-800"
    },
    {
        name: "Out",
        backgroundColor: "bg-out px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "Payment",
        backgroundColor: "bg-payment px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "Privat",
        backgroundColor: "bg-privat px-2 py-1",
        textColor: "text-black"
    },
    {
        name: "Termin",
        backgroundColor: "bg-termin px-2 py-1",
        textColor: "text-black"
    }
];

export const getStatusConfig = (statusName: string): StatusConfig => {
    const config = STATUS_CONFIG.find(status => status.name === statusName);
    return config || {
        name: statusName,
        backgroundColor: "",
        textColor: ""
    };
};
