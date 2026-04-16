import { Briefcase, FileText, MailPlus, Paperclip, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UI_PRESETS } from '@/lib/ui-presets';

export type InternFormTab = 'personal' | 'academic' | 'documents' | 'general' | 'access';

type InternFormTabsProps = {
    activeTab: InternFormTab;
    onTabChange: (tab: InternFormTab) => void;
    showAccessTab: boolean;
};

export default function InternFormTabs({ activeTab, onTabChange, showAccessTab }: InternFormTabsProps) {
    return (
        <div className="flex flex-wrap items-end gap-1.5">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${UI_PRESETS.tabBase} ${activeTab === 'personal' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                onClick={() => onTabChange('personal')}
            >
                <User className="mr-1.5 size-4 shrink-0" />
                Personales
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${UI_PRESETS.tabBase} ${activeTab === 'academic' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                onClick={() => onTabChange('academic')}
            >
                <Briefcase className="mr-1.5 size-4 shrink-0" />
                Prácticas
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${UI_PRESETS.tabBase} ${activeTab === 'documents' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                onClick={() => onTabChange('documents')}
            >
                <Paperclip className="mr-1.5 size-4 shrink-0" />
                Adjuntos
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${UI_PRESETS.tabBase} ${activeTab === 'general' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                onClick={() => onTabChange('general')}
            >
                <FileText className="mr-1.5 size-4 shrink-0" />
                Notas
            </Button>

            {showAccessTab ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`${UI_PRESETS.tabBase} ${activeTab === 'access' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                    onClick={() => onTabChange('access')}
                >
                    <MailPlus className="mr-1.5 size-4 shrink-0" />
                    Acceso
                </Button>
            ) : null}
        </div>
    );
}
