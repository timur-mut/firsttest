using System.Data;

namespace FirstTest.Api.Data;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
}
