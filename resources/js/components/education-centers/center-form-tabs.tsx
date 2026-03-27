import { Building2, FileText, GraduationCap, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type CenterFormTab = 'center' | 'agreement' | 'general' | 'history';

type CenterFormTabsProps = {
    activeTab: CenterFormTab;
    onTabChange: (tab: CenterFormTab) => void;
    isReadOnly: boolean;
};

export default function CenterFormTabs({ activeTab, onTabChange, isReadOnly }: CenterFormTabsProps) {
    return (
        <div className="flex flex-wrap items-end gap-1.5">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer ${
                    activeTab === 'center'
                        ? 'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                        : 'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                }`}
                onClick={() => onTabChange('center')}
            >
                <Building2 className="mr-1.5 size-4 shrink-0" />
                Centro
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer ${
                    activeTab === 'agreement'
                        ? 'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                        : 'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                }`}
                onClick={() => onTabChange('agreement')}
            >
                <Handshake className="mr-1.5 size-4 shrink-0" />
                Convenio
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer ${
                    activeTab === 'general'
                        ? 'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                        : 'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                }`}
                onClick={() => onTabChange('general')}
            >
                <FileText className="mr-1.5 size-4 shrink-0" />
                Notas
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => isReadOnly && onTabChange('history')}
                disabled={!isReadOnly}
                className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 ${
                    !isReadOnly
                        ? 'cursor-not-allowed border-transparent text-muted-foreground/60'
                        : activeTab === 'history'
                            ? 'cursor-pointer border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                            : 'cursor-pointer border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                }`}
            >
                <GraduationCap className="mr-1.5 size-4 shrink-0" />
                Alumnos
            </Button>
        </div>
    );
}