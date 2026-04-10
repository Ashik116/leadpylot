"use client"
import Card from '@/components/ui/Card';
import SummaryCard from "./SummaryCard"

const fakeDate = [
    { id: 1, title: "Earning", value: 20000, iconName: "dollar" },
    { id: 2, title: "Due", value: 1500, iconName: "dollar" },
    { id: 3, title: "paid", value: 500, iconName: "dollar" },
    { id: 4, title: "Buying leads", value: 100 }
]

const HomeWrapper = () => {
    return (
        <Card className="min-h-[85dvh]">
            <div className="pb-10">
                <h1 className="capitalize">Summary</h1>

            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 xl:gap-4">
                {fakeDate.map((data, key) => (
                    <div key={key}>
                        <SummaryCard title={data.title} info={data.value} iconName={data?.iconName} />
                    </div>
                ))}

            </div>
        </Card>
    )
}

export default HomeWrapper;