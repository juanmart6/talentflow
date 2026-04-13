<!doctype html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Verifica tu correo - TalentFlow</title>
</head>
<body style="margin:0; padding:24px; background:#f8fafc; font-family:Arial, sans-serif; color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
        <tr>
            <td style="padding:24px;">
                <p style="margin:0 0 16px; text-align:center;">
                    <img
                        src="{{ url('/tf-logo.svg') }}"
                        alt="TalentFlow"
                        width="180"
                        style="display:inline-block; height:auto;"
                    >
                </p>

                <h1 style="margin:0 0 12px; text-align:center; font-size:22px; line-height:1.3;">Confirma tu correo electrónico</h1>

                <p style="margin:0 0 12px; font-size:15px; line-height:1.6;">
                    Hola{{ $userName ? ' ' . $userName : '' }}, para activar tu cuenta en <strong>TalentFlow</strong> necesitamos que verifiques tu correo.
                </p>

                <p style="margin:0 0 20px; text-align:center;">
                    <a
                        href="{{ $verifyUrl }}"
                        style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; font-weight:600; padding:10px 16px; border-radius:8px;"
                    >
                        Verificar correo
                    </a>
                </p>

                <p style="margin:0 0 8px; font-size:13px; color:#64748b; line-height:1.6;">
                    Si el botón no funciona, copia y pega este enlace en tu navegador:
                </p>

                <p style="margin:0; font-size:13px; color:#334155; word-break:break-all;">
                    {{ $verifyUrl }}
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
