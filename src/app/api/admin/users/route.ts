import { NextResponse } from 'next/server';
import { dbHelper } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const users = await dbHelper.getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Erro ao carregar usuários.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'create') {
      const { name, email, password, balance, role } = body;

      if (!name || !email || !password || balance === undefined || !role) {
        return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
      }

      // Check if user already exists
      const existingUser = await dbHelper.getUserByEmail(email);
      if (existingUser) {
        return NextResponse.json({ error: 'Usuário com este e-mail já existe.' }, { status: 400 });
      }

      const passwordHash = hashPassword(password);
      const newUser = await dbHelper.adminCreateUser({
        name,
        email,
        passwordHash,
        balance: parseFloat(balance) || 0,
        role
      });

      return NextResponse.json({
        success: true,
        message: `Usuário ${newUser.name} cadastrado com sucesso!`,
        user: newUser
      });
      
    } else if (action === 'delete') {
      const { email } = body;

      if (!email) {
        return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
      }

      const success = await dbHelper.deleteUser(email);
      if (!success) {
        return NextResponse.json({ error: 'Não é possível excluir o administrador principal.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Usuário excluído com sucesso!'
      });

    } else {
      // Default legacy action: adjust balance
      const { email, amount } = body;

      if (!email || amount === undefined || isNaN(parseFloat(amount))) {
        return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
      }

      await dbHelper.adjustUserBalance(email, parseFloat(amount));
      
      return NextResponse.json({ 
        success: true, 
        message: `Saldo do usuário ${email} atualizado em R$ ${parseFloat(amount).toFixed(2)}.` 
      });
    }
  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json({ error: 'Erro ao processar requisição.' }, { status: 500 });
  }
}
